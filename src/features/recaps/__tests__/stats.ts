import type { LogItem } from "@/features/logs";
import { buildCards } from "../build-cards";
import { addDays } from "../days";
import type { PeriodKind, RecapCard } from "../types";
import { makeInput, makeTags } from "./utils";

const mon = "2026-10-05";
const oct = "2026-10-01";

const SLEEP_STEPS = ["rating", "tags", "emotions", "sleep"] as const;

const sleep = (quality: LogItem["sleep"]["quality"]) => ({
  sleep: { quality },
});

const run = (from: string, count: number, extra: Partial<LogItem> = {}) =>
  Array.from({ length: count }, (_, index) => ({
    date: addDays(from, index),
    ...extra,
  }));

const cardsOf = <T extends RecapCard["type"]>(
  type: T,
  input: Parameters<typeof makeInput>[0] & { kind?: PeriodKind }
) =>
  buildCards(makeInput({ today: "2026-12-31", ...input })).filter(
    (card): card is Extract<RecapCard, { type: T }> => card.type === type
  );

describe("mood chart", () => {
  test("has a bar per day up to today, gaps as null", () => {
    const [card] = cardsOf("mood-chart", {
      date: oct,
      today: "2026-10-05",
      items: [
        ...run(oct, 3, { rating: "good" }),
        { date: "2026-10-05", rating: "extremely_bad" },
      ],
    });
    expect(card?.days).toEqual([
      { date: "2026-10-01", rating: 4 },
      { date: "2026-10-02", rating: 4 },
      { date: "2026-10-03", rating: 4 },
      { date: "2026-10-04", rating: null },
      { date: "2026-10-05", rating: 0 },
    ]);
  });

  test("needs 4 check-in days", () => {
    expect(cardsOf("mood-chart", { date: mon, items: run(mon, 3) })).toEqual(
      []
    );
  });
});

describe("mood count", () => {
  test("counts days per mood, worst to best, with the good share", () => {
    const [card] = cardsOf("mood-count", {
      kind: "month",
      date: oct,
      items: [
        ...run(oct, 6, { rating: "very_good" }),
        ...run("2026-10-10", 4, { rating: "bad" }),
        // Two entries, one day: counts once, by its mean.
        { date: "2026-10-20", rating: "extremely_good" },
        { date: "2026-10-20", rating: "neutral" },
      ],
    });
    expect(card?.counts.map((count) => count.days)).toEqual([
      0, 0, 4, 0, 0, 7, 0,
    ]);
    expect(card?.goodShare).toBeCloseTo(7 / 11);
  });
});

describe("good and harder days", () => {
  test("lists each kind from 2 days on", () => {
    const cards = cardsOf("mood-days", {
      kind: "month",
      date: oct,
      items: [
        ...run(oct, 3, { rating: "good" }),
        { date: "2026-10-10", rating: "very_bad" },
        { date: "2026-10-11", rating: "neutral" },
      ],
    });
    expect(cards).toEqual([
      {
        type: "mood-days",
        mode: "good",
        dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
      },
    ]);
  });

  test("shows harder days with 2 of them", () => {
    const cards = cardsOf("mood-days", {
      kind: "month",
      date: oct,
      items: run("2026-10-10", 2, { rating: "bad" }),
    });
    expect(cards).toEqual([
      {
        type: "mood-days",
        mode: "hard",
        dates: ["2026-10-10", "2026-10-11"],
      },
    ]);
  });
});

describe("sleep chart", () => {
  test("shows the nights of a month from 7 nights with sleep", () => {
    const items = run(oct, 7, sleep("good"));
    const steps = [...SLEEP_STEPS];
    expect(
      cardsOf("sleep-chart", { kind: "month", date: oct, steps, items })
    ).toEqual([expect.objectContaining({ type: "sleep-chart" })]);
    expect(
      cardsOf("sleep-chart", {
        kind: "month",
        date: oct,
        steps,
        items: items.slice(1),
      })
    ).toEqual([]);
  });

  test("needs the sleep step", () => {
    expect(
      cardsOf("sleep-chart", {
        kind: "month",
        date: oct,
        steps: ["rating"],
        items: run(oct, 10, sleep("good")),
      })
    ).toEqual([]);
  });
});

const tagged = (id: string, from: string, count: number) =>
  run(from, count, { tags: [{ id }] });

describe("tags", () => {
  const tags = makeTags(4);

  test("ranks active tags by days in a month", () => {
    const [card] = cardsOf("tags", {
      kind: "month",
      date: oct,
      tags: [...tags.slice(0, 3), { ...tags[3], isArchived: true }],
      items: [
        ...tagged("tag-1", oct, 5),
        ...tagged("tag-0", "2026-10-10", 2),
        ...tagged("tag-2", "2026-10-15", 3),
        ...tagged("tag-3", "2026-10-20", 9),
      ],
    });
    expect(card?.counts).toEqual([
      { tagId: "tag-1", days: 5 },
      { tagId: "tag-2", days: 3 },
      { tagId: "tag-0", days: 2 },
    ]);
  });

  test("tag days: a card per tag on 6+ days of a month, top 2", () => {
    const cards = cardsOf("tag-days", {
      kind: "month",
      date: oct,
      tags,
      items: [
        ...tagged("tag-0", oct, 6),
        ...tagged("tag-1", "2026-10-10", 8),
        ...tagged("tag-2", "2026-10-20", 7),
        ...tagged("tag-3", "2026-10-28", 3),
      ],
    });
    expect(cards.map((card) => [card.tagId, card.dates.length])).toEqual([
      ["tag-1", 8],
      ["tag-2", 7],
    ]);
  });
});

describe("year", () => {
  const year = "2026-01-01";

  test("year in pixels from 30 check-in days", () => {
    expect(
      cardsOf("year-pixels", { kind: "year", date: year, items: run(year, 30) })
    ).toEqual([{ type: "year-pixels", days: 30 }]);
    expect(
      cardsOf("year-pixels", { kind: "year", date: year, items: run(year, 29) })
    ).toEqual([]);
  });

  test("best and hardest month by mean mood, 7+ days each", () => {
    const items = [
      ...run("2026-02-01", 10, { rating: "bad" }),
      ...run("2026-06-01", 10, { rating: "very_good" }),
      ...run("2026-08-01", 10, { rating: "good" }),
      // Too few days to rank, however good.
      ...run("2026-09-01", 3, { rating: "extremely_good" }),
    ];
    expect(cardsOf("best-month", { kind: "year", date: year, items })).toEqual([
      { type: "best-month", best: "2026-06-01", hardest: "2026-02-01" },
    ]);
  });

  test("one ranked month has no hardest month", () => {
    expect(
      cardsOf("best-month", {
        kind: "year",
        date: year,
        items: run("2026-06-01", 7),
      })
    ).toEqual([{ type: "best-month", best: "2026-06-01", hardest: null }]);
  });
});
