import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../buildCards";
import { addDays } from "../days";
import { makeInput, makeTags } from "./utils";

const mon = "2026-10-05";
const STEPS: ConfigurableLoggerStep[] = ["rating", "tags", "people"];
const sport = { tags: [{ id: "tag-0" }] };
const tags = makeTags(3);

/** `count` days from `from`; every `every`-th day gets `extra`. */
const days = (
  from: string,
  count: number,
  every: number,
  extra: Partial<LogItem>
) =>
  Array.from({ length: count }, (_, index): Partial<LogItem> => {
    const day: Partial<LogItem> = {
      date: addDays(from, index),
      rating: index % 2 === 0 ? "neutral" : "good",
    };
    return index % every === 0 ? { ...day, ...extra } : day;
  });

/** 40 days; people take turns, and every 4th day is very good. */
const withPeople = (ids: string[]) =>
  Array.from({ length: 40 }, (_, index) => ({
    date: addDays("2026-07-01", index),
    rating: index % 4 === 0 ? ("very_good" as const) : ("neutral" as const),
    people: ids.flatMap((id, at) =>
      (index + at) % ids.length === 0 ? [{ id }] : []
    ),
  }));

const cards = (type: string, input: Parameters<typeof makeInput>[0]) =>
  buildCards(
    makeInput({
      today: "2026-10-12",
      date: mon,
      reminderEnabled: true,
      steps: STEPS,
      tags,
      ...input,
    })
  ).filter((card) => card.type === type);

describe("stood out", () => {
  // 60 days before the week; Sport on every 6th day, always very good.
  const history = days("2026-08-06", 60, 6, { ...sport, rating: "very_good" });

  test("names a tag on 2+ days this week with a strong lift before", () => {
    expect(
      cards("stood-out", {
        items: [
          ...history,
          { date: mon, ...sport },
          { date: "2026-10-07", ...sport },
        ],
      })
    ).toEqual([
      {
        type: "stood-out",
        tagId: "tag-0",
        days: 2,
        with: 5,
        without: 3.6,
      },
    ]);
  });

  test("needs the tag on 2 days this week", () => {
    expect(
      cards("stood-out", { items: [...history, { date: mon, ...sport }] })
    ).toEqual([]);
  });

  test("never names a tag whose days felt heavier", () => {
    const heavy = days("2026-08-06", 60, 6, { ...sport, rating: "very_bad" });

    expect(
      cards("stood-out", {
        items: [
          ...heavy,
          { date: mon, ...sport },
          { date: "2026-10-07", ...sport },
        ],
      })
    ).toEqual([]);
  });

  test("never names an archived tag", () => {
    expect(
      cards("stood-out", {
        tags: makeTags(3, { isArchived: true }),
        items: [
          ...history,
          { date: mon, ...sport },
          { date: "2026-10-07", ...sport },
        ],
      })
    ).toEqual([]);
  });

  test("needs 28 days of history before the week", () => {
    expect(
      cards("stood-out", {
        items: [
          ...history.slice(-27),
          { date: mon, ...sport },
          { date: "2026-10-07", ...sport },
        ],
      })
    ).toEqual([]);
  });
});

describe("what moves your mood", () => {
  const quarter = {
    kind: "quarter" as const,
    date: "2026-07-01",
    today: "2026-10-01",
  };

  test("lists tags with a clear effect, never the General category", () => {
    const [card] = cards("what-moves", {
      ...quarter,
      items: days("2026-07-01", 42, 3, { ...sport, rating: "very_good" }),
    });

    expect(card).toEqual(
      expect.objectContaining({
        type: "what-moves",
        categories: [],
        places: [],
        tags: [expect.objectContaining({ id: "tag-0", signal: "strong" })],
      })
    );
  });

  test("needs 40 check-in days in the period", () => {
    expect(
      cards("what-moves", {
        ...quarter,
        items: days("2026-07-01", 39, 3, { ...sport, rating: "very_good" }),
      })
    ).toEqual([]);
  });

  test("stays hidden without any strong row", () => {
    expect(
      cards("what-moves", {
        ...quarter,
        items: days("2026-07-01", 42, 3, sport),
      })
    ).toEqual([]);
  });
});

describe("people and mood", () => {
  const quarter = {
    kind: "quarter" as const,
    date: "2026-07-01",
    today: "2026-10-01",
  };

  test("needs 4 people with 5+ connected days each", () => {
    const four = cards("people-mood", {
      ...quarter,
      items: withPeople(["a", "b", "c", "d"]),
    });
    const three = cards("people-mood", {
      ...quarter,
      items: withPeople(["a", "b", "c"]),
    });

    expect(four.map((card) => card.type)).toEqual(["people-mood"]);
    expect(
      four
        .flatMap((card) =>
          "people" in card ? card.people.map((row) => row.id) : []
        )
        .sort()
    ).toEqual(["a", "b", "c", "d"]);
    expect(three).toEqual([]);
  });

  test("stays hidden when no person shows a clear difference", () => {
    const flat = withPeople(["a", "b", "c", "d"]).map((day) => ({
      ...day,
      rating: "neutral" as const,
    }));

    expect(cards("people-mood", { ...quarter, items: flat })).toEqual([]);
  });

  test("skips the card with the People step off", () => {
    expect(
      cards("people-mood", {
        ...quarter,
        steps: ["rating", "tags"],
        items: withPeople(["a", "b", "c", "d"]),
      })
    ).toEqual([]);
  });
});
