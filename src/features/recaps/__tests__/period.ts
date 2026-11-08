import { getDays, getPeriodDays } from "../days";
import { getPeriod, shiftPeriod } from "../period";
import { _generateItem } from "@/testing/log-item";

describe("getPeriod", () => {
  test("uses calendar months and years", () => {
    expect(getPeriod("month", "2026-02-14")).toEqual({
      kind: "month",
      start: "2026-02-01",
      end: "2026-02-28",
    });
    expect(getPeriod("year", "2026-06-01")).toEqual({
      kind: "year",
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
});

describe("shiftPeriod", () => {
  test("steps back across a year boundary", () => {
    const month = getPeriod("month", "2026-01-10");
    expect(shiftPeriod(month, -1)).toEqual({
      kind: "month",
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });
});

describe("getPeriodDays", () => {
  test("groups entries of the period by day, oldest first", () => {
    const period = getPeriod("month", "2026-10-07");
    const items = [
      _generateItem({ id: "a", date: "2026-10-09" }),
      _generateItem({ id: "b", date: "2026-09-30" }),
      _generateItem({ id: "c", date: "2026-10-01" }),
      _generateItem({ id: "d", date: "2026-10-09" }),
    ];

    expect(
      getPeriodDays(getDays(items), period).map((day) => [
        day.date,
        day.items.map((item) => item.id),
      ])
    ).toEqual([
      ["2026-10-01", ["c"]],
      ["2026-10-09", ["a", "d"]],
    ]);
  });
});
