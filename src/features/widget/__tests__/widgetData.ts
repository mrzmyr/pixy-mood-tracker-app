import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import {
  WEEK_WIDGET_WEEKS,
  WIDGET_TIMELINE_DAYS,
  YEAR_GRID_COLUMNS,
  YEAR_WIDGET_TIMELINE_DAYS,
  getMonthWidgetProps,
  getWeekWidgetProps,
  getWidgetTimeline,
  getYearGrid,
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
  test("builds four weeks with the current week last and today marked", () => {
    const props = getWeekWidgetProps(INPUT);
    expect(props.weeks).toHaveLength(WEEK_WIDGET_WEEKS);
    expect(props.url).toBe("pixy://calendar");
    for (const week of props.weeks) {
      expect(week).toHaveLength(7);
    }
    const thisWeek = props.weeks.at(-1) ?? [];
    const today = thisWeek.find((day) => day.isToday);
    expect(today?.day).toBe(15);
    // very_bad (1) and very_good (5) average to neutral (3).
    expect(today?.rating).toBe("neutral");
    expect(thisWeek.find((day) => day.day === 13)?.rating).toBe("good");
    expect(
      thisWeek.filter((day) => day.isFuture).map((day) => day.day)
    ).toEqual(expect.arrayContaining([16, 17]));
    expect(props.weeks[0].some((day) => day.isToday)).toBe(false);
  });

  test("subtitle counts logged days over elapsed days of all four weeks", () => {
    const props = getWeekWidgetProps(INPUT);
    const elapsed = props.weeks.flat().filter((day) => !day.isFuture).length;
    expect(props.subtitle).toBe(`2/${elapsed}`);
    expect(elapsed).toBe(21 + 5);
  });

  test("resolves scale colors for both color schemes", () => {
    const props = getWeekWidgetProps(INPUT);
    expect(props.light.ratings.good).toMatch(/^#/u);
    expect(props.dark.ratings.good).toMatch(/^#/u);
    expect(props.light.background).not.toBe(props.dark.background);
    expect(props.light.empty).not.toBe(props.light.future);
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

describe("getYearGrid()", () => {
  test("builds 53 week columns of seven with padding outside the year", () => {
    const grid = getYearGrid(INPUT);
    expect(grid.columns).toHaveLength(YEAR_GRID_COLUMNS);
    for (const column of grid.columns) {
      expect(column).toHaveLength(7);
    }
    const codes = grid.columns.flat();
    expect(codes.filter((code) => code !== "p")).toHaveLength(365);
    expect(grid.cells).toHaveLength(365);
    const todayCode = grid.columns[grid.today.column][grid.today.row];
    expect(todayCode).toBe("neutral");
    expect(codes.filter((code) => code === "good")).toHaveLength(1);
    expect(codes.filter((code) => code === "f")).toHaveLength(365 - 288);
    expect(grid.months).toHaveLength(12);
    expect(grid.months[9].label).toBe("Oct");
    expect(grid.months[9].today).toBe(15);
    expect(
      grid.months[1].weeks.flat().filter((code) => code !== "p")
    ).toHaveLength(28);
  });
});

describe("getYearWidgetProps()", () => {
  test("carries the captured images and counts logged days", () => {
    const images = {
      light: "file:///l.png",
      dark: "file:///d.png",
      lightLarge: "file:///ll.png",
      darkLarge: "file:///dl.png",
      version: 7,
    };
    const props = getYearWidgetProps(INPUT, images);
    expect(props.title).toBe("2026");
    expect(props.imageLight).toBe(images.light);
    expect(props.imageDark).toBe(images.dark);
    expect(props.imageLightLarge).toBe(images.lightLarge);
    expect(props.imageDarkLarge).toBe(images.darkLarge);
    expect(props.imageVersion).toBe(7);
    expect(props.subtitle).toBe("2/288");
  });

  test("uses empty image URIs before the first capture", () => {
    const props = getYearWidgetProps(INPUT);
    expect(props.imageLight).toBe("");
    expect(props.imageDark).toBe("");
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
    expect(
      (timeline[1].props.weeks.at(-1) ?? []).find((day) => day.isToday)?.day
    ).toBe(16);
  });

  test("year keeps one entry to stay under the extension memory limit", () => {
    const timeline = getWidgetTimeline(
      INPUT,
      getYearWidgetProps,
      YEAR_WIDGET_TIMELINE_DAYS
    );
    expect(timeline).toHaveLength(1);
    expect(timeline[0].props.title).toBe("2026");
  });
});
