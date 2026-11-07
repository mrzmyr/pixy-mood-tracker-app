import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../build-cards";
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
  const items = [
    { date: mon, people: [lena, sam] },
    { date: "2026-10-06", people: [lena] },
  ];

  test("podium lists the most connected people from 2 people on", () => {
    expect(summaries("most-connected", { items })).toEqual([
      {
        type: "most-connected",
        people: [
          { personId: "lena", days: 2 },
          { personId: "sam", days: 1 },
        ],
      },
    ]);
    expect(
      summaries("most-connected", { items: [{ date: mon, people: [lena] }] })
    ).toEqual([]);
  });

  test("leaves deleted people out of the podium count", () => {
    expect(summaries("most-connected", { items, personIds: ["sam"] })).toEqual(
      []
    );
  });

  test("shows no podium with the People step off", () => {
    expect(summaries("most-connected", { items, steps: ["rating"] })).toEqual(
      []
    );
  });
});

describe("places", () => {
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
      summaries("places", {
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
        type: "places",
        trips: [
          { city: "Lisbon", start: "2026-10-03", end: "2026-10-06", days: 2 },
          { city: "Lisbon", start: "2026-10-10", end: "2026-10-10", days: 1 },
          { city: "Potsdam", start: "2026-10-20", end: "2026-10-20", days: 1 },
        ],
        spots: [],
      },
    ]);
  });

  test("ends a trip on a day checked in at home", () => {
    expect(
      summaries("places", {
        ...month,
        items: [
          ...home,
          { date: "2026-10-03", location: lisbon },
          { date: "2026-10-04", location: berlin },
          { date: "2026-10-05", location: lisbon },
        ],
      })
    ).toEqual([
      {
        type: "places",
        trips: [
          { city: "Lisbon", start: "2026-10-03", end: "2026-10-03", days: 1 },
          { city: "Lisbon", start: "2026-10-05", end: "2026-10-05", days: 1 },
        ],
        spots: [{ name: "Mitte", days: 1 }],
      },
    ]);
  });

  test("never counts the far side of the home city as a trip", () => {
    const spread = [
      ...run("2026-09-01", 10, {
        location: {
          latitude: 52.36,
          longitude: 13.5,
          name: "Schönefeld, Berlin",
        },
      }),
      ...run("2026-09-11", 10, {
        location: { latitude: 52.6, longitude: 13.2, name: "Spandau, Berlin" },
      }),
    ];

    expect(
      summaries("places", {
        ...month,
        items: [
          ...spread,
          {
            date: "2026-10-03",
            location: {
              latitude: 52.6,
              longitude: 13.2,
              name: "Spandau, Berlin",
            },
          },
        ],
      })
    ).toEqual([]);
  });

  test("lists areas of home and nearby towns by days, from 2 places", () => {
    const kreuzberg = {
      latitude: 52.49,
      longitude: 13.42,
      name: "Kreuzberg, Berlin",
    };
    const nearby = {
      latitude: 52.39,
      longitude: 13.1,
      name: "Babelsberg, Potsdam",
    };

    expect(
      summaries("places", {
        ...month,
        items: [
          ...home,
          { date: "2026-10-05", location: berlin },
          { date: "2026-10-06", location: kreuzberg },
          { date: "2026-10-07", location: berlin },
          { date: "2026-10-08", location: nearby },
        ],
      })
    ).toEqual([
      {
        type: "places",
        trips: [],
        spots: [
          { name: "Mitte", days: 2 },
          { name: "Kreuzberg", days: 1 },
          { name: "Potsdam", days: 1 },
        ],
      },
    ]);
  });

  test("shows no card for one place without a trip, and needs location on", () => {
    const kreuzberg = {
      latitude: 52.49,
      longitude: 13.42,
      name: "Kreuzberg, Berlin",
    };

    expect(
      summaries("places", {
        ...month,
        items: [...home, { date: "2026-10-03", location: kreuzberg }],
      })
    ).toEqual([]);
    expect(
      summaries("places", {
        ...month,
        locationEnabled: false,
        items: [...home, { date: "2026-10-03", location: lisbon }],
      })
    ).toEqual([]);
  });
});
