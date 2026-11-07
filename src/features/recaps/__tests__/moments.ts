import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../build-cards";
import { CARD_TYPES } from "../card-types";
import { addDays } from "../days";
import { makeInput, makeTags } from "./utils";

// October 2026, reviewed mid-month.
const october = { today: "2026-10-12", date: "2026-10-05" };
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

const moments = (input: Parameters<typeof makeInput>[0]) =>
  buildCards(
    makeInput({ ...october, reminderEnabled: true, steps: ALL_STEPS, ...input })
  ).filter((card) => CARD_TYPES[card.type].family === "moment");

/** The emotions-back card of the period. */
const emotionsBack = (...emotions: { emotion: string; lastDate: string }[]) => [
  { type: "emotion-again", emotions },
];

/** The tags-back card of the period. */
const tagsBack = (
  ...tags: { tagId: string; days: number; weeks: number }[]
) => [{ type: "tag-back", tags }];

describe("emotion again", () => {
  test("shows a good emotion back after 30 days, not after 29", () => {
    expect(
      moments({
        items: [
          { date: "2026-09-05", emotions: ["proud"] },
          { date: mon, emotions: ["proud"] },
        ],
      })
    ).toEqual(emotionsBack({ emotion: "proud", lastDate: "2026-09-05" }));
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

  test("puts every emotion back into one card, longest break first", () => {
    expect(
      moments({
        items: [
          { date: "2026-08-01", emotions: ["calm"] },
          { date: "2026-06-01", emotions: ["proud"] },
          { date: mon, emotions: ["calm", "proud"] },
        ],
      })
    ).toEqual(
      emotionsBack(
        { emotion: "proud", lastDate: "2026-06-01" },
        { emotion: "calm", lastDate: "2026-08-01" }
      )
    );
  });
});

/** The single people card of the month with these rows. */
const peopleCard = (...people: object[]) => [
  { type: "people-moments", people },
];

const monthMoments = (input: Parameters<typeof makeInput>[0]) =>
  buildCards(
    makeInput({
      kind: "month",
      date: "2026-10-01",
      today: "2026-11-02",
      reminderEnabled: true,
      steps: ALL_STEPS,
      ...input,
    })
  ).filter((card) => CARD_TYPES[card.type].family === "moment");

describe("people", () => {
  const sam = { people: [{ id: "sam" }] };
  const history = run("2026-08-01", 15);

  test("shows a person back after 28 days, not after 27", () => {
    expect(
      monthMoments({
        items: [
          { date: "2026-09-07", ...sam },
          { date: mon, ...sam },
        ],
      })
    ).toEqual(
      peopleCard({
        kind: "back",
        personId: "sam",
        lastDate: "2026-09-07",
        weeks: 4,
      })
    );
    expect(
      monthMoments({
        items: [
          { date: "2026-09-08", ...sam },
          { date: mon, ...sam },
        ],
      })
    ).toEqual([]);
  });

  test("welcomes a new person only with 15 earlier check-in days", () => {
    expect(
      monthMoments({ items: [...history, { date: mon, ...sam }] })
    ).toEqual(peopleCard({ kind: "new", personId: "sam", firstDate: mon }));
    expect(
      monthMoments({ items: [...history.slice(1), { date: mon, ...sam }] })
    ).toEqual([]);
  });

  test("celebrates crossing 10 connected days in the calendar year", () => {
    const nine = run("2026-09-01", 9, sam);

    expect(monthMoments({ items: [...nine, { date: mon, ...sam }] })).toEqual(
      peopleCard({ kind: "milestone", personId: "sam", days: 10, year: 2026 })
    );
    expect(
      monthMoments({ items: [...nine.slice(1), { date: mon, ...sam }] })
    ).toEqual([]);
  });

  test("counts milestones per calendar year", () => {
    const lastYear = run("2025-12-20", 9, sam);

    expect(
      monthMoments({ items: [...lastYear, { date: mon, ...sam }] })
    ).toEqual(
      peopleCard({
        kind: "back",
        personId: "sam",
        lastDate: "2025-12-28",
        weeks: 40,
      })
    );
  });

  test("puts everyone into one card, in order of their first connection", () => {
    const rosa = { people: [{ id: "rosa" }] };

    expect(
      monthMoments({
        items: [
          { date: "2026-09-01", ...sam },
          { date: "2026-09-01", ...rosa },
          { date: mon, ...rosa },
          { date: "2026-10-07", ...sam },
        ],
        personIds: ["sam", "rosa"],
      })
    ).toEqual(
      peopleCard(
        { kind: "back", personId: "rosa", lastDate: "2026-09-01", weeks: 5 },
        { kind: "back", personId: "sam", lastDate: "2026-09-01", weeks: 5 }
      )
    );
  });

  test("never names a deleted person", () => {
    const items = [
      { date: "2026-09-01", ...sam },
      { date: mon, ...sam },
    ];

    expect(monthMoments({ items, personIds: [] })).toEqual([]);
    expect(monthMoments({ items, personIds: ["sam"] })).toEqual(
      peopleCard({
        kind: "back",
        personId: "sam",
        lastDate: "2026-09-01",
        weeks: 5,
      })
    );
  });

  test("shows nothing with the People step off", () => {
    expect(
      monthMoments({
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
    ).toEqual(tagsBack({ tagId: "tag-0", days: 1, weeks: 8 }));
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
