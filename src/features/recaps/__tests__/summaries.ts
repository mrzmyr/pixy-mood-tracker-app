import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../buildCards";
import { addDays } from "../days";
import type { PeriodKind } from "../types";
import { makeInput } from "./utils";

const mon = "2026-10-05";
const STEPS: ConfigurableLoggerStep[] = [
  "rating",
  "tags",
  "emotions",
  "people",
  "photos",
];

const run = (from: string, count: number, extra: Partial<LogItem> = {}) =>
  Array.from({ length: count }, (_, index) => ({
    date: addDays(from, index),
    ...extra,
  }));

const summaries = (
  type: string,
  input: Parameters<typeof makeInput>[0] & { kind?: PeriodKind }
) =>
  buildCards(
    makeInput({
      today: "2026-10-12",
      date: mon,
      reminderEnabled: true,
      steps: STEPS,
      ...input,
    })
  ).filter((card) => card.type === type);

describe("one day", () => {
  test("picks the extremely good day with most emotions", () => {
    expect(
      summaries("day-recap", {
        items: [
          { date: mon, rating: "extremely_good", emotions: ["calm"] },
          {
            date: "2026-10-07",
            rating: "extremely_good",
            emotions: ["calm", "proud"],
          },
          {
            date: "2026-10-08",
            rating: "very_good",
            emotions: ["a", "b", "c"],
          },
        ],
      })
    ).toEqual([{ type: "day-recap", mode: "best", date: "2026-10-07" }]);
  });

  test("tells a harder day only without an extremely good one", () => {
    expect(
      summaries("day-recap", {
        items: [
          { date: mon, rating: "very_bad" },
          { date: "2026-10-06", rating: "bad" },
          { date: "2026-10-07", rating: "very_good" },
        ],
      })
    ).toEqual([{ type: "day-recap", mode: "hard", date: mon }]);
    expect(
      summaries("day-recap", {
        items: [
          { date: mon, rating: "neutral" },
          { date: "2026-10-07", rating: "very_good" },
        ],
      })
    ).toEqual([]);
  });

  test("looks back a year in week recaps, extremely good days only", () => {
    const yearAgo = { date: "2025-10-07", rating: "extremely_good" as const };

    expect(
      summaries("day-recap", {
        items: [yearAgo, { date: mon, rating: "good" }],
      })
    ).toEqual([{ type: "day-recap", mode: "ago", date: "2025-10-07" }]);
    expect(
      summaries("day-recap", {
        items: [
          { ...yearAgo, rating: "very_good" },
          { date: mon, rating: "good" },
        ],
      })
    ).toEqual([]);
    expect(
      summaries("day-recap", {
        kind: "month",
        date: "2026-10-01",
        today: "2026-11-02",
        items: [yearAgo, { date: mon, rating: "good" }],
      })
    ).toEqual([]);
  });
});

describe("your emotions", () => {
  test("counts days per emotion from 3 different emotions", () => {
    expect(
      summaries("emotions", {
        items: [
          { date: mon, emotions: ["calm", "proud"] },
          { date: mon, emotions: ["calm"] },
          { date: "2026-10-06", emotions: ["calm", "tired"] },
        ],
      })
    ).toEqual([
      {
        type: "emotions",
        counts: [
          { emotion: "calm", days: 2 },
          { emotion: "proud", days: 1 },
          { emotion: "tired", days: 1 },
        ],
      },
    ]);
    expect(
      summaries("emotions", {
        items: [{ date: mon, emotions: ["calm", "proud"] }],
      })
    ).toEqual([]);
  });
});

describe("people", () => {
  const lena = { id: "lena" };
  const sam = { id: "sam" };

  test("lists everyone connected with their top 2 emotions", () => {
    expect(
      summaries("connected", {
        items: [
          { date: mon, people: [lena], emotions: ["calm", "worried"] },
          { date: "2026-10-06", people: [lena], emotions: ["calm"] },
          { date: "2026-10-07", people: [sam], emotions: [] },
        ],
      })
    ).toEqual([
      {
        type: "connected",
        people: [
          { personId: "lena", days: 2, emotions: ["calm", "worried"] },
          { personId: "sam", days: 1, emotions: [] },
        ],
      },
    ]);
  });

  test("shows no people card with the People step off or nobody", () => {
    expect(
      summaries("connected", {
        items: [{ date: mon, people: [lena] }],
        steps: ["rating"],
      })
    ).toEqual([]);
    expect(summaries("connected", { items: [{ date: mon }] })).toEqual([]);
  });

  test("podium needs 2 people and a month or longer", () => {
    const month = {
      kind: "month" as const,
      date: "2026-10-01",
      today: "2026-11-02",
    };

    expect(
      summaries("most-connected", {
        ...month,
        items: [
          { date: mon, people: [lena, sam] },
          { date: "2026-10-06", people: [lena] },
        ],
      })
    ).toEqual([
      {
        type: "most-connected",
        people: [
          { personId: "lena", days: 2, emotions: [] },
          { personId: "sam", days: 1, emotions: [] },
        ],
      },
    ]);
    expect(
      summaries("most-connected", {
        ...month,
        items: [{ date: mon, people: [lena] }],
      })
    ).toEqual([]);
    expect(
      summaries("most-connected", {
        items: [{ date: mon, people: [lena, sam] }],
      })
    ).toEqual([]);
  });
});

describe("places and trips", () => {
  const month = {
    kind: "month" as const,
    date: "2026-10-01",
    today: "2026-11-02",
    locationEnabled: true,
  };
  const berlin = { latitude: 52.52, longitude: 13.4, name: "Mitte, Berlin" };
  const lisbon = { latitude: 38.72, longitude: -9.14, name: "Baixa, Lisbon" };
  const potsdam = {
    latitude: 52.39,
    longitude: 13.06,
    name: "Babelsberg, Potsdam",
  };
  const home = run("2026-09-01", 20, { location: berlin });

  test("joins days away in one city across gaps up to 2 days", () => {
    expect(
      summaries("places-trips", {
        ...month,
        items: [
          ...home,
          { date: "2026-10-03", location: lisbon },
          { date: "2026-10-06", location: lisbon },
          { date: "2026-10-10", location: lisbon },
          { date: "2026-10-20", location: potsdam },
        ],
      })
    ).toEqual([
      {
        type: "places-trips",
        trips: [
          { city: "Lisbon", start: "2026-10-03", end: "2026-10-06", days: 2 },
          { city: "Lisbon", start: "2026-10-10", end: "2026-10-10", days: 1 },
          { city: "Potsdam", start: "2026-10-20", end: "2026-10-20", days: 1 },
        ],
      },
    ]);
  });

  test("ignores places near home and needs location on", () => {
    const kreuzberg = {
      latitude: 52.49,
      longitude: 13.42,
      name: "Kreuzberg, Berlin",
    };

    expect(
      summaries("places-trips", {
        ...month,
        items: [...home, { date: "2026-10-03", location: kreuzberg }],
      })
    ).toEqual([]);
    expect(
      summaries("places-trips", {
        ...month,
        locationEnabled: false,
        items: [...home, { date: "2026-10-03", location: lisbon }],
      })
    ).toEqual([]);
  });
});
