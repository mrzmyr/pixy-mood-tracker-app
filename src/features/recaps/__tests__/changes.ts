import type { LogItem } from "@/features/logs";
import { buildCards } from "../build-cards";
import { getTrend } from "../cards/changes";
import { addDays } from "../days";
import { makeInput, makeTags } from "./utils";

const year = {
  kind: "year" as const,
  date: "2026-01-01",
  today: "2027-01-01",
  reminderEnabled: true,
  steps: ["rating" as const, "tags" as const],
  tags: makeTags(1),
};

/** Every day of 2026; Sport every 2nd day, rated by `sportRating(index)`. */
const year2026 = (sportRating: (index: number) => LogItem["rating"]) =>
  Array.from({ length: 365 }, (_, index) =>
    index % 2 === 0
      ? {
          date: addDays("2026-01-01", index),
          rating: sportRating(index),
          tags: [{ id: "tag-0" }],
        }
      : { date: addDays("2026-01-01", index), rating: "neutral" as const }
  );

/** Sport days neutral in the first half of 2026, very good after. */
const liftFromJuly = (index: number): LogItem["rating"] =>
  index < 182 ? "neutral" : "very_good";

describe("getTrend", () => {
  test("names the direction once the change reaches 0.25 steps", () => {
    expect(getTrend(0.1, 0.3)).toBe("steady");
    expect(getTrend(0.1, 0.4)).toBe("growing-lift");
    expect(getTrend(0.8, 0.4)).toBe("fading-lift");
    expect(getTrend(-0.2, -0.6)).toBe("weighs-more");
    expect(getTrend(-0.8, -0.2)).toBe("weighs-less");
    expect(getTrend(-1, 1)).toBe("growing-lift");
    expect(getTrend(1, -1)).toBe("weighs-more");
  });

  test("reads a line that ends at +0.0 by where it came from", () => {
    expect(getTrend(0.6, -0.04)).toBe("fading-lift");
    expect(getTrend(-0.6, 0.04)).toBe("weighs-less");
  });
});

describe("tags over time", () => {
  test("shows a lift that grows over the year", () => {
    const card = buildCards(
      makeInput({
        ...year,
        items: year2026(liftFromJuly),
      })
    ).find((item) => item.type === "trend-tags");
    const [line] = card && "series" in card ? card.series : [];

    expect(card?.type).toBe("trend-tags");
    expect(line?.trend).toBe("growing-lift");
    expect(line?.first).toBe(0);
    expect(line?.last).toBe(2);
    expect(line?.values).toHaveLength(23);
  });

  test("dates every point, so the chart can label months", () => {
    const card = buildCards(
      makeInput({
        ...year,
        items: year2026(liftFromJuly),
      })
    ).find((item) => item.type === "trend-tags");
    const ends = card && "ends" in card ? card.ends : [];

    expect(ends).toHaveLength(23);
    expect(ends.at(0)).toBe("2026-03-01");
    expect(ends.at(-1)).toBe("2026-12-31");
  });

  test("skips a tag on every day: nothing to compare with", () => {
    const daily = year2026(liftFromJuly).map((day) => ({
      ...day,
      tags: [{ id: "tag-0" }, { id: "tag-1" }],
    }));
    const card = buildCards(
      makeInput({ ...year, tags: makeTags(2), items: daily })
    ).find((item) => item.type === "trend-tags");

    expect(card).toBeUndefined();
  });

  test("stays hidden when every line is steady", () => {
    expect(
      buildCards(
        makeInput({ ...year, items: year2026(() => "very_good") })
      ).filter((item) => item.type === "trend-tags")
    ).toEqual([]);
  });

  test("never shows in month recaps", () => {
    expect(
      buildCards(
        makeInput({
          ...year,
          kind: "month",
          date: "2026-09-01",
          items: year2026(liftFromJuly),
        })
      ).filter((item) => item.type === "trend-tags")
    ).toEqual([]);
  });
});
