import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import {
  WIDGET_TIMELINE_DAYS,
  getMonthWidgetProps,
  getWeekWidgetProps,
  getWidgetTimeline,
  getYearWidgetProps,
} from "../widgetData";

// Thursday 2026-10-15, local time.
const NOW = dayjs("2026-10-15T14:30:00");
const INPUT = {
  items: [
    _generateItem({ dateTime: "2026-10-13T09:00:00", rating: "good" }),
    _generateItem({ dateTime: "2026-10-15T09:00:00", rating: "very_bad" }),
    _generateItem({ dateTime: "2026-10-15T20:00:00", rating: "very_good" }),
  ],
  scaleType: "ColorBrew-RdYlGn",
  url: "pixy://calendar",
  now: NOW,
};

describe("getWeekWidgetProps()", () => {
  test("builds seven days with today marked and the day average rating", () => {
    const props = getWeekWidgetProps(INPUT);
    expect(props.days).toHaveLength(7);
    expect(props.url).toBe("pixy://calendar");
    const today = props.days.find((day) => day.isToday);
    expect(today?.day).toBe(15);
    // very_bad (1) and very_good (5) average to neutral (3).
    expect(today?.rating).toBe("neutral");
    expect(props.days.find((day) => day.day === 13)?.rating).toBe("good");
    expect(
      props.days.filter((day) => day.isFuture).map((day) => day.day)
    ).toEqual(expect.arrayContaining([16, 17]));
  });

  test("subtitle counts logged days over elapsed days", () => {
    const props = getWeekWidgetProps(INPUT);
    const elapsed = props.days.filter((day) => !day.isFuture).length;
    expect(props.subtitle).toBe(`2/${elapsed}`);
  });

  test("resolves scale colors for both color schemes", () => {
    const props = getWeekWidgetProps(INPUT);
    expect(props.light.ratings.good).toMatch(/^#/u);
    expect(props.dark.ratings.good).toMatch(/^#/u);
    expect(props.light.background).not.toBe(props.dark.background);
  });

  test("falls back to the default scale for an unknown scale type", () => {
    const props = getWeekWidgetProps({ ...INPUT, scaleType: "nope" });
    expect(props.light.ratings).toEqual(
      getWeekWidgetProps(INPUT).light.ratings
    );
  });
});

describe("getMonthWidgetProps()", () => {
  test("pads the first and last week and keeps 31 days", () => {
    const props = getMonthWidgetProps(INPUT);
    expect(props.title).toBe("October");
    expect(props.weekdays).toHaveLength(7);
    for (const week of props.weeks) {
      expect(week).toHaveLength(7);
    }
    const cells = props.weeks.flat().filter((cell) => cell.day !== 0);
    expect(cells).toHaveLength(31);
    expect(cells.map((cell) => cell.day)).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1)
    );
    expect(cells.filter((cell) => cell.isToday)).toHaveLength(1);
    expect(props.subtitle).toBe("2/15");
  });
});

describe("getYearWidgetProps()", () => {
  test("builds twelve rows of 31 with padding for short months", () => {
    const props = getYearWidgetProps(INPUT);
    expect(props.title).toBe("2026");
    expect(props.months).toHaveLength(12);
    expect(props.monthLabels[0]).toBe("Jan");
    expect(props.months[1].filter((code) => code !== "p")).toHaveLength(28);
    expect(props.months[9].filter((code) => code !== "p")).toHaveLength(31);
    expect(props.today).toEqual({ month: 9, day: 15 });
    expect(props.months[9][12]).toBe("good");
    expect(props.months[9][14]).toBe("neutral");
    expect(props.months[11][30]).toBe("f");
    expect(props.months[0][0]).toBe("");
  });
});

describe("props are property-list safe", () => {
  // NSUserDefaults rejects null; a single null anywhere breaks every widget.
  test("no null in any widget props", () => {
    expect(JSON.stringify(getWeekWidgetProps(INPUT))).not.toContain("null");
    expect(JSON.stringify(getMonthWidgetProps(INPUT))).not.toContain("null");
    expect(JSON.stringify(getYearWidgetProps(INPUT))).not.toContain("null");
    expect(
      JSON.stringify(getWeekWidgetProps({ ...INPUT, items: [] }))
    ).not.toContain("null");
  });
});

describe("getWidgetTimeline()", () => {
  test("schedules one entry now and one per following midnight", () => {
    const timeline = getWidgetTimeline(INPUT, getWeekWidgetProps);
    expect(timeline).toHaveLength(WIDGET_TIMELINE_DAYS);
    expect(timeline[0].date).toEqual(NOW.toDate());
    expect(timeline[1].date).toEqual(NOW.add(1, "day").startOf("day").toDate());
    expect(timeline[1].props.days.find((day) => day.isToday)?.day).toBe(16);
  });
});
