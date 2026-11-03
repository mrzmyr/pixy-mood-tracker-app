import chroma, { contrast, mix } from "chroma-js";
import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import {
  WIDGET_TIMELINE_DAYS,
  YEAR_GRID_COLUMNS,
  getMonthWidgetProps,
  getWeekWidgetProps,
  getWidgetTimeline,
  getYearGrid,
  getSchemeColors,
  getYearImageColors,
  getYearWidgetProps,
} from "../widget-data";

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
  test("builds the current week with today marked", () => {
    const props = getWeekWidgetProps(INPUT);
    expect(props.url).toBe("pixy://calendar");
    expect(props.days).toHaveLength(7);
    const today = props.days.find((day) => day.isToday);
    expect(today?.day).toBe(15);
    // very_bad (1) and very_good (5) average to neutral (3).
    expect(today?.rating).toBe("neutral");
    expect(props.days.find((day) => day.day === 13)?.rating).toBe("good");
    expect(
      props.days.filter((day) => day.isFuture).map((day) => day.day)
    ).toEqual(expect.arrayContaining([16, 17]));
  });

  test("Pixy smiles and thanks once today has an entry", () => {
    const checkedIn = getWeekWidgetProps(INPUT);
    const notYet = getWeekWidgetProps({ ...INPUT, now: NOW.add(1, "day") });
    expect(checkedIn.isCheckedIn).toBe(true);
    expect(notYet.isCheckedIn).toBe(false);
    expect(checkedIn.prompt).not.toBe(notYet.prompt);
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
      light: ["file:///l0.png", "file:///l1.png"],
      dark: ["file:///d0.png"],
      lightLarge: ["file:///ll0.png"],
      darkLarge: ["file:///dl0.png"],
      version: 7,
    };
    const props = getYearWidgetProps(INPUT, images);
    expect(props.title).toBe("2026");
    expect(props.rowsLight).toEqual(images.light);
    expect(props.rowsDark).toEqual(images.dark);
    expect(props.rowsLightLarge).toEqual(images.lightLarge);
    expect(props.rowsDarkLarge).toEqual(images.darkLarge);
    expect(props.imageVersion).toBe(7);
    expect(props.subtitle).toBe("2/288");
  });
});

const luminance = (color: string) => chroma(color).luminance();

/** A see-through color as it shows on `backdrop`. */
const over = (color: string, backdrop: string) => {
  const fill = chroma(color);
  return mix(backdrop, fill.alpha(1), fill.alpha(), "rgb").hex();
};

/** What sits behind widget cells: the sky color, and white clouds by day. */
const backdrops = (theme: "light" | "dark", background: string) =>
  theme === "light" ? [background, "#FFFFFF"] : [background];

describe("getSchemeColors()", () => {
  test.each(["light", "dark"] as const)(
    "%s future days sit between the sky and empty days",
    (theme) => {
      const colors = getSchemeColors(theme, "ColorBrew-RdYlGn");
      for (const backdrop of backdrops(theme, colors.background)) {
        const [low, high] = [
          luminance(backdrop),
          luminance(over(colors.empty, backdrop)),
        ].sort((a, b) => a - b);
        const future = luminance(over(colors.future, backdrop));
        expect(future).toBeGreaterThan(low);
        expect(future).toBeLessThan(high);
      }
    }
  );

  test.each(["light", "dark"] as const)(
    "%s empty days stay visible on sky and clouds",
    (theme) => {
      const colors = getSchemeColors(theme, "ColorBrew-RdYlGn");
      for (const backdrop of backdrops(theme, colors.background)) {
        expect(
          contrast(over(colors.empty, backdrop), backdrop)
        ).toBeGreaterThanOrEqual(1.25);
      }
    }
  );

  test("dark future days stay visible on the night sky", () => {
    const colors = getSchemeColors("dark", "ColorBrew-RdYlGn");
    // Small cells on a dark home screen need more than a faint step.
    expect(
      contrast(over(colors.future, colors.background), colors.background)
    ).toBeGreaterThanOrEqual(1.5);
  });
});

describe("getYearImageColors()", () => {
  // view-shot stores see-through pixels premultiplied: they turn dark.
  test.each(["light", "dark"] as const)(
    "%s year images use opaque cell colors that match the widget cells",
    (theme) => {
      const image = getYearImageColors(theme, "ColorBrew-RdYlGn");
      const widget = getSchemeColors(theme, "ColorBrew-RdYlGn");
      for (const key of ["empty", "future", "edge"] as const) {
        expect(chroma(image[key]).alpha()).toBe(1);
        expect(image[key]).toBe(over(widget[key], widget.background));
      }
    }
  );
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
    // Midnight entries start without a check-in: Pixy is curious again.
    expect(timeline[1].props.isCheckedIn).toBe(false);
  });
});
