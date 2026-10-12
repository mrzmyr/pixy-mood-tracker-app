import type { LogItem } from "@/features/logs";
import { buildCards } from "../buildCards";
import { getTrend } from "../cards/changes";
import { addDays } from "../days";
import { makeInput, makeTags } from "./utils";

const quarter = {
  kind: "quarter" as const,
  date: "2026-07-01",
  today: "2026-10-01",
  reminderEnabled: true,
  steps: ["rating" as const, "tags" as const],
  tags: makeTags(1),
};

/** Every day of Q3; Sport every 2nd day, rated by `sportRating(index)`. */
const q3 = (sportRating: (index: number) => LogItem["rating"]) =>
  Array.from({ length: 92 }, (_, index) =>
    index % 2 === 0
      ? {
          date: addDays("2026-07-01", index),
          rating: sportRating(index),
          tags: [{ id: "tag-0" }],
        }
      : { date: addDays("2026-07-01", index), rating: "neutral" as const }
  );

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
  test("shows a lift that grows over the quarter", () => {
    const card = buildCards(
      makeInput({
        ...quarter,
        items: q3((index) => (index < 46 ? "neutral" : "very_good")),
      })
    ).find((item) => item.type === "trend-tags");
    const [line] = card && "series" in card ? card.series : [];

    expect(card?.type).toBe("trend-tags");
    expect(line?.trend).toBe("growing-lift");
    expect(line?.first).toBe(0);
    expect(line?.last).toBe(2);
    expect(line?.values).toHaveLength(10);
  });

  test("dates every point, so the chart can label months", () => {
    const card = buildCards(
      makeInput({
        ...quarter,
        items: q3((index) => (index < 46 ? "neutral" : "very_good")),
      })
    ).find((item) => item.type === "trend-tags");
    const ends = card && "ends" in card ? card.ends : [];

    expect(ends).toHaveLength(10);
    expect(ends.at(0)?.startsWith("2026-07")).toBe(true);
    expect(ends.at(-1)).toBe("2026-09-30");
  });

  test("skips a tag on every day: nothing to compare with", () => {
    const daily = q3((index) => (index < 46 ? "neutral" : "very_good")).map(
      (day) => ({ ...day, tags: [{ id: "tag-0" }, { id: "tag-1" }] })
    );
    const card = buildCards(
      makeInput({ ...quarter, tags: makeTags(2), items: daily })
    ).find((item) => item.type === "trend-tags");

    expect(card).toBeUndefined();
  });

  test("stays hidden when every line is steady", () => {
    expect(
      buildCards(
        makeInput({ ...quarter, items: q3(() => "very_good") })
      ).filter((item) => item.type === "trend-tags")
    ).toEqual([]);
  });

  test("never shows in month recaps", () => {
    expect(
      buildCards(
        makeInput({
          ...quarter,
          kind: "month",
          date: "2026-09-01",
          items: q3((index) => (index < 46 ? "neutral" : "very_good")),
        })
      ).filter((item) => item.type === "trend-tags")
    ).toEqual([]);
  });
});
