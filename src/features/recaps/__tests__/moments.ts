import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../buildCards";
import { addDays } from "../days";
import { makeInput, makeTags } from "./utils";

// Week of Monday 2026-10-05 to Sunday 2026-10-11, reviewed on Monday after.
const week = { today: "2026-10-12", date: "2026-10-05" };
const mon = "2026-10-05";

/** `count` days in a row from `from`, each with `extra`. */
const run = (from: string, count: number, extra: Partial<LogItem> = {}) =>
  Array.from({ length: count }, (_, index) => ({
    date: addDays(from, index),
    ...extra,
  }));

const ALL_STEPS: ConfigurableLoggerStep[] = [
  "rating",
  "tags",
  "emotions",
  "people",
  "photos",
  "sleep",
];

const night = (quality: LogItem["sleep"]["quality"]) => ({
  sleep: { quality },
});

const moments = (input: Parameters<typeof makeInput>[0]) =>
  buildCards(
    makeInput({ ...week, reminderEnabled: true, steps: ALL_STEPS, ...input })
  ).filter((card) => !card.type.startsWith("intro"));

describe("emotion again", () => {
  test("shows a good emotion back after 30 days, not after 29", () => {
    expect(
      moments({
        items: [
          { date: "2026-09-05", emotions: ["proud"] },
          { date: mon, emotions: ["proud"] },
        ],
      })
    ).toEqual([
      { type: "emotion-again", emotion: "proud", lastDate: "2026-09-05" },
    ]);
    expect(
      moments({
        items: [
          { date: "2026-09-06", emotions: ["proud"] },
          { date: mon, emotions: ["proud"] },
        ],
      })
    ).toEqual([]);
  });

  test("never welcomes a hard emotion back", () => {
    expect(
      moments({
        items: [
          { date: "2026-07-01", emotions: ["stressed"] },
          { date: mon, emotions: ["stressed"] },
        ],
      })
    ).toEqual([]);
  });

  test("picks the emotion with the longest gap", () => {
    expect(
      moments({
        items: [
          { date: "2026-08-01", emotions: ["calm"] },
          { date: "2026-06-01", emotions: ["proud"] },
          { date: mon, emotions: ["calm", "proud"] },
        ],
      })
    ).toEqual([
      { type: "emotion-again", emotion: "proud", lastDate: "2026-06-01" },
    ]);
  });
});

describe("emotion absent", () => {
  // 21 days up to Sunday: 2026-09-21 to 2026-10-11.
  const stressedBefore = run("2026-08-10", 6, { emotions: ["stressed"] });
  const calmRecent = run("2026-09-21", 12, { rating: "good" });

  test("shows a hard emotion gone for 3 weeks after 5+ days before", () => {
    expect(moments({ items: [...stressedBefore, ...calmRecent] })).toEqual([
      {
        type: "emotion-absent",
        emotion: "stressed",
        countBefore: 6,
        since: "2026-09-21",
      },
    ]);
  });

  test("needs 12 check-in days in those 3 weeks", () => {
    expect(
      moments({ items: [...stressedBefore, ...calmRecent.slice(1)] })
    ).toEqual([]);
  });

  test("needs the emotion on 5 days before", () => {
    expect(
      moments({ items: [...stressedBefore.slice(2), ...calmRecent] })
    ).toEqual([]);
  });

  test("stays quiet in a heavier week", () => {
    const usual = run("2026-07-01", 20, { rating: "good" });
    const heavyWeek = run(mon, 7, { rating: "bad" });

    expect(
      moments({
        items: [
          ...usual,
          ...stressedBefore,
          ...run("2026-09-21", 14, { rating: "good" }),
          ...heavyWeek,
        ],
      })
    ).toEqual([]);
  });

  test("counts only days that happened in the current week", () => {
    // Wednesday: since moves back to 2026-09-17, so 2026-09-17 to -20 count.
    expect(
      moments({
        today: "2026-10-07",
        items: [
          ...stressedBefore,
          { date: "2026-09-18", emotions: ["stressed"] },
          ...calmRecent,
        ],
      })
    ).toEqual([]);
    expect(
      moments({
        today: "2026-10-12",
        items: [
          ...stressedBefore,
          { date: "2026-09-18", emotions: ["stressed"] },
          ...calmRecent,
        ],
      })
    ).toEqual([
      {
        type: "emotion-absent",
        emotion: "stressed",
        countBefore: 7,
        since: "2026-09-21",
      },
    ]);
  });

  test("stays quiet with the Emotions step off", () => {
    expect(
      moments({
        items: [...stressedBefore, ...calmRecent],
        steps: ["rating", "tags"],
      })
    ).toEqual([]);
  });

  test("ignores neutral emotions like tired", () => {
    const tiredBefore = run("2026-08-10", 6, { emotions: ["tired"] });

    expect(moments({ items: [...tiredBefore, ...calmRecent] })).toEqual([]);
  });
});

describe("people", () => {
  const sam = { people: [{ id: "sam" }] };
  const history = run("2026-08-01", 15);

  test("shows a person back after 28 days, not after 27", () => {
    expect(
      moments({
        items: [
          { date: "2026-09-07", ...sam },
          { date: mon, ...sam },
        ],
      })
    ).toEqual([
      {
        type: "person-back",
        personId: "sam",
        lastDate: "2026-09-07",
        weeks: 4,
      },
    ]);
    expect(
      moments({
        items: [
          { date: "2026-09-08", ...sam },
          { date: mon, ...sam },
        ],
      })
    ).toEqual([]);
  });

  test("welcomes a new person only with 15 earlier check-in days", () => {
    expect(moments({ items: [...history, { date: mon, ...sam }] })).toEqual([
      { type: "person-new", personId: "sam", firstDate: mon },
    ]);
    expect(
      moments({ items: [...history.slice(1), { date: mon, ...sam }] })
    ).toEqual([]);
  });

  test("celebrates crossing 10 connected days in the calendar year", () => {
    const nine = run("2026-09-01", 9, sam);

    expect(moments({ items: [...nine, { date: mon, ...sam }] })).toEqual([
      { type: "person-milestone", personId: "sam", days: 10, year: 2026 },
    ]);
    expect(
      moments({ items: [...nine.slice(1), { date: mon, ...sam }] })
    ).toEqual([]);
  });

  test("counts milestones per calendar year", () => {
    const lastYear = run("2025-12-20", 9, sam);

    expect(moments({ items: [...lastYear, { date: mon, ...sam }] })).toEqual([
      {
        type: "person-back",
        personId: "sam",
        lastDate: "2025-12-28",
        weeks: 40,
      },
    ]);
  });

  test("shows nothing with the People step off", () => {
    expect(
      moments({
        items: [
          { date: "2026-09-01", ...sam },
          { date: mon, ...sam },
        ],
        steps: ["rating", "tags"],
      })
    ).toEqual([]);
  });
});

describe("first city", () => {
  const berlin = run("2026-08-01", 15, {
    location: { latitude: 52.5, longitude: 13.4, name: "Mitte, Berlin" },
  });
  const potsdam = {
    date: "2026-10-09",
    location: { latitude: 52.4, longitude: 13.1, name: "Babelsberg, Potsdam" },
  };

  test("shows a city never seen before, with location on", () => {
    expect(
      moments({ items: [...berlin, potsdam], locationEnabled: true })
    ).toEqual([
      {
        type: "first-city",
        city: "Potsdam",
        district: "Babelsberg",
        date: "2026-10-09",
      },
    ]);
    expect(
      moments({ items: [...berlin, potsdam], locationEnabled: false })
    ).toEqual([]);
  });

  test("needs 15 earlier days with a place", () => {
    const unplaced = run("2026-08-01", 15);

    expect(
      moments({ items: [...unplaced, potsdam], locationEnabled: true })
    ).toEqual([]);
    expect(
      moments({
        items: [...unplaced, ...berlin.slice(1), potsdam],
        locationEnabled: true,
      })
    ).toEqual([]);
  });

  test("skips cities seen before and places without a name", () => {
    expect(
      moments({
        items: [
          ...berlin,
          {
            date: mon,
            location: {
              latitude: 52.5,
              longitude: 13.4,
              name: "Kreuzberg, Berlin",
            },
          },
          {
            date: "2026-10-06",
            location: { latitude: 1, longitude: 1, name: null },
          },
        ],
        locationEnabled: true,
      })
    ).toEqual([]);
  });
});

describe("tag back", () => {
  const sport = { tags: [{ id: "tag-0" }], rating: "very_good" as const };
  const tags = makeTags(1);
  const before = run("2026-08-01", 8, sport);
  const plain = run("2026-07-01", 10, { rating: "neutral" });

  test("shows a tag back after 21 days with 8 uses before", () => {
    expect(
      moments({ items: [...plain, ...before, { date: mon, ...sport }], tags })
    ).toEqual([{ type: "tag-back", tagId: "tag-0", days: 1, weeks: 8 }]);
  });

  test("needs 8 uses before", () => {
    expect(
      moments({
        items: [...plain, ...before.slice(1), { date: mon, ...sport }],
        tags,
      })
    ).toEqual([]);
  });

  test("never welcomes back a tag whose days feel heavier than usual", () => {
    const heavy = { tags: [{ id: "tag-0" }], rating: "bad" as const };

    expect(
      moments({
        items: [
          ...plain,
          ...run("2026-08-01", 8, heavy),
          { date: mon, ...heavy },
        ],
        tags,
      })
    ).toEqual([]);
  });

  test("skips deleted tags", () => {
    expect(
      moments({
        items: [...plain, ...before, { date: mon, ...sport }],
        tags: [],
      })
    ).toEqual([]);
  });
});

describe("sleep", () => {
  test("shows 3 good nights after 2 rough nights the week before", () => {
    expect(
      moments({
        items: [
          ...run("2026-09-28", 2, night("bad")),
          ...run("2026-10-07", 3, night("very_good")),
        ],
      })
    ).toEqual([
      {
        type: "sleep-turnaround",
        nights: ["2026-10-07", "2026-10-08", "2026-10-09"],
      },
    ]);
  });

  test("needs the nights in a row", () => {
    expect(
      moments({
        items: [
          ...run("2026-09-28", 2, night("bad")),
          { date: "2026-10-06", ...night("good") },
          { date: "2026-10-07", ...night("good") },
          { date: "2026-10-09", ...night("good") },
        ],
      })
    ).toEqual([]);
  });

  test("notices 3 rough nights after a steadier week", () => {
    expect(
      moments({
        items: [
          { date: "2026-09-29", ...night("bad") },
          ...run("2026-09-30", 2, night("neutral")),
          ...run("2026-10-05", 3, night("very_bad")),
        ],
      })
    ).toEqual([
      {
        type: "sleep-rough",
        nights: ["2026-10-05", "2026-10-06", "2026-10-07"],
      },
    ]);
  });

  test("never calls a week without sleep data steadier", () => {
    expect(moments({ items: run("2026-10-05", 3, night("very_bad")) })).toEqual(
      []
    );
  });

  test("ignores entries that skipped sleep", () => {
    // SAFETY: entries saved with the sleep step skipped store `null`.
    // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see comment above.
    const skipped = { sleep: { quality: null } } as unknown as Partial<LogItem>;

    expect(
      moments({
        items: [
          ...run("2026-09-28", 2, night("bad")),
          ...run("2026-10-07", 3, night("very_good")),
          { date: "2026-10-08", ...skipped },
        ],
      })
    ).toEqual([
      {
        type: "sleep-turnaround",
        nights: ["2026-10-07", "2026-10-08", "2026-10-09"],
      },
    ]);
  });

  test("stays quiet with the Sleep step off", () => {
    expect(
      moments({
        items: run("2026-10-05", 3, night("very_bad")),
        steps: ["rating"],
      })
    ).toEqual([]);
  });
});
