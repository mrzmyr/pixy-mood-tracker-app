import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import type { LogItem } from "@/features/logs";
import { getWeekPixels } from "../feelingCheck/weekPixels";

const entry = (date: string, rating: LogItem["rating"]) =>
  _generateItem({
    date,
    dateTime: dayjs(date).hour(12).toISOString(),
    rating,
  });

describe("getWeekPixels()", () => {
  test("returns the entry day and the 6 days before, oldest first", () => {
    const pixels = getWeekPixels({ items: [], date: "2026-10-02" });

    expect(pixels.map((pixel) => pixel.date)).toEqual([
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(pixels.every((pixel) => pixel.rating === null)).toBe(true);
  });

  test("colors each day with the calendar's day average", () => {
    const pixels = getWeekPixels({
      items: [
        entry("2026-09-25", "extremely_bad"),
        entry("2026-09-27", "very_good"),
        entry("2026-09-30", "bad"),
        entry("2026-10-02", "extremely_good"),
        entry("2026-10-02", "neutral"),
        entry("2026-10-03", "extremely_bad"),
      ],
      date: "2026-10-02",
    });

    expect(pixels.map((pixel) => pixel.rating)).toEqual([
      null,
      "very_good",
      null,
      null,
      "bad",
      null,
      // (6 + 3) / 2 rounds to 5.
      "very_good",
    ]);
  });
});
