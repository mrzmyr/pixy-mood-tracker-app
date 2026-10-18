import { getDays, getPeriodDays } from "../days";
import { getPeriod, shiftPeriod } from "../period";
import { _generateItem } from "@/testing/log-item";
import { getWeekLocale } from "@/lib/translation";
import { WEEK_LOCALE } from "./utils";

describe("getPeriod", () => {
  test("starts weeks on the device week start", () => {
    expect(getPeriod("week", "2026-10-07", WEEK_LOCALE)).toEqual({
      kind: "week",
      start: "2026-10-05",
      end: "2026-10-11",
    });
    expect(
      getPeriod("week", "2026-10-07", getWeekLocale({ weekStart: 0 }))
    ).toEqual({
      kind: "week",
      start: "2026-10-04",
      end: "2026-10-10",
    });
  });

  test("uses calendar months, quarters, and years", () => {
    expect(getPeriod("month", "2026-02-14", WEEK_LOCALE)).toEqual({
      kind: "month",
      start: "2026-02-01",
      end: "2026-02-28",
    });
    expect(getPeriod("quarter", "2026-11-30", WEEK_LOCALE)).toEqual({
      kind: "quarter",
      start: "2026-10-01",
      end: "2026-12-31",
    });
    expect(getPeriod("year", "2026-06-01", WEEK_LOCALE)).toEqual({
      kind: "year",
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
});

describe("shiftPeriod", () => {
  test("steps back across a year boundary", () => {
    const quarter = getPeriod("quarter", "2026-02-10", WEEK_LOCALE);
    expect(shiftPeriod(quarter, -1, WEEK_LOCALE)).toEqual({
      kind: "quarter",
      start: "2025-10-01",
      end: "2025-12-31",
    });
    const week = getPeriod("week", "2026-01-02", WEEK_LOCALE);
    expect(shiftPeriod(week, -1, WEEK_LOCALE)).toEqual({
      kind: "week",
      start: "2025-12-22",
      end: "2025-12-28",
    });
  });
});

describe("getPeriodDays", () => {
  test("groups entries of the period by day, oldest first", () => {
    const period = getPeriod("week", "2026-10-07", WEEK_LOCALE);
    const items = [
      _generateItem({ id: "a", date: "2026-10-09" }),
      _generateItem({ id: "b", date: "2026-10-04" }),
      _generateItem({ id: "c", date: "2026-10-05" }),
      _generateItem({ id: "d", date: "2026-10-09" }),
    ];

    expect(
      getPeriodDays(getDays(items), period).map((day) => [
        day.date,
        day.items.map((item) => item.id),
      ])
    ).toEqual([
      ["2026-10-05", ["c"]],
      ["2026-10-09", ["a", "d"]],
    ]);
  });
});
