import { getWeekLocale } from "@/lib/translation";
import { parseCalendarParams } from "../views";
import {
  getMonthGrid,
  getWeekDays,
  getYears,
  layoutDayEntries,
} from "../screens/Calendar/layout";

const today = "2026-10-04";
const sunday = getWeekLocale({ weekStart: 0 });
const monday = getWeekLocale({ weekStart: 1 });

describe("parseCalendarParams", () => {
  it("keeps a valid view and past date", () => {
    expect(
      parseCalendarParams({
        params: { view: "week", date: "2026-09-01" },
        isEnabled: true,
        today,
      })
    ).toEqual({ view: "week", date: "2026-09-01" });
  });

  it("shows months while the flag is off", () => {
    expect(
      parseCalendarParams({ params: { view: "year" }, isEnabled: false, today })
        .view
    ).toBe("month");
  });

  it("drops unknown views and invalid or future dates", () => {
    for (const date of [
      "2026-02-30",
      "2026-10-05",
      "yesterday",
      "",
      undefined,
    ]) {
      expect(
        parseCalendarParams({
          params: { view: "decade", date },
          isEnabled: true,
          today,
        })
      ).toEqual({ view: "month", date: null });
    }
  });
});

describe("getYears", () => {
  it("lists every year from the first entry to now", () => {
    expect(getYears({ first: 2024, last: 2026 })).toEqual([
      "2024",
      "2025",
      "2026",
    ]);
    expect(getYears({ first: 2026, last: 2026 })).toEqual(["2026"]);
  });
});

describe("getMonthGrid", () => {
  it("places each day under its weekday for the locale's week start", () => {
    // 1 October 2026 is a Thursday.
    const sundayFirst = getMonthGrid({ month: "2026-10-01", locale: sunday });
    const mondayFirst = getMonthGrid({ month: "2026-10-01", locale: monday });
    expect(sundayFirst[0].indexOf("2026-10-01")).toBe(4);
    expect(mondayFirst[0].indexOf("2026-10-01")).toBe(3);
  });

  it("holds every day once in six rows", () => {
    const grid = getMonthGrid({ month: "2026-03-01", locale: sunday });
    const days = grid.flat().filter((day) => day !== null);
    expect(grid).toHaveLength(6);
    expect(days).toHaveLength(31);
    expect(new Set(days).size).toBe(31);
  });
});

describe("getWeekDays", () => {
  it("returns the locale week around the date", () => {
    expect(getWeekDays({ date: "2026-10-04", locale: sunday })).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
    expect(getWeekDays({ date: "2026-10-04", locale: monday })[0]).toBe(
      "2026-09-28"
    );
  });
});

describe("layoutDayEntries", () => {
  it("gives entries that do not overlap the full width", () => {
    const result = layoutDayEntries([{ minutes: 600 }, { minutes: 480 }], 60);
    expect(result).toEqual([
      { minutes: 480, lane: 0, lanes: 1 },
      { minutes: 600, lane: 0, lanes: 1 },
    ]);
  });

  it("splits overlapping entries into lanes and reuses free lanes", () => {
    const result = layoutDayEntries(
      [{ minutes: 600 }, { minutes: 630 }, { minutes: 670 }],
      60
    );
    expect(result).toEqual([
      { minutes: 600, lane: 0, lanes: 2 },
      { minutes: 630, lane: 1, lanes: 2 },
      { minutes: 670, lane: 0, lanes: 2 },
    ]);
  });
});
