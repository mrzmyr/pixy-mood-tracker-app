import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { LogItem } from "@/features/logs";
import { buildCards } from "../build-cards";
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

describe("what moves your mood", () => {
  const year = {
    kind: "year" as const,
    date: "2026-07-01",
    today: "2026-10-01",
  };

  test("lists tags with a clear effect, never the General category", () => {
    const [card] = cards("what-moves", {
      ...year,
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
        ...year,
        items: days("2026-07-01", 39, 3, { ...sport, rating: "very_good" }),
      })
    ).toEqual([]);
  });

  test("stays hidden without any strong row", () => {
    expect(
      cards("what-moves", {
        ...year,
        items: days("2026-07-01", 42, 3, sport),
      })
    ).toEqual([]);
  });
});

describe("people and mood", () => {
  const year = {
    kind: "year" as const,
    date: "2026-07-01",
    today: "2026-10-01",
  };

  test("needs 4 people with 5+ connected days each", () => {
    const four = cards("people-mood", {
      ...year,
      items: withPeople(["a", "b", "c", "d"]),
    });
    const three = cards("people-mood", {
      ...year,
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

    expect(cards("people-mood", { ...year, items: flat })).toEqual([]);
  });

  test("skips the card with the People step off", () => {
    expect(
      cards("people-mood", {
        ...year,
        steps: ["rating", "tags"],
        items: withPeople(["a", "b", "c", "d"]),
      })
    ).toEqual([]);
  });
});
