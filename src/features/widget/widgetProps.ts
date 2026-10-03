import type { LogItem } from "@/features/logs";

/** Mood rating key, as stored on an entry. */
export type WidgetRating = LogItem["rating"];

/**
 * One day in a widget grid.
 *
 * Props are stored in `NSUserDefaults`, which rejects `null`, so empty
 * values are `""` and `0`, never `null` or `undefined`.
 */
export interface WidgetCell {
  /** Day of month, 1 to 31. `0` pads a grid slot outside the range. */
  day: number;
  /** Average rating of the day's entries; `""` when nothing was logged. */
  rating: WidgetRating | "";
  isToday: boolean;
  /** After today: drawn lighter, never counted as missing. */
  isFuture: boolean;
}

/** Grid slot outside the month or year. */
export const PAD_CELL: WidgetCell = {
  day: 0,
  rating: "",
  isToday: false,
  isFuture: false,
};

/** Colors for one color scheme. Widgets cannot read the theme, so both come as props. */
export interface WidgetSchemeColors {
  background: string;
  text: string;
  textSecondary: string;
  /** Fill for a past day without an entry: visible on the background. */
  empty: string;
  /** Fill for a day after today: fainter than `empty`. */
  future: string;
  /** Ring around today's cell. */
  today: string;
  /** Fill per rating, from the user's color scale. */
  ratings: Record<WidgetRating, string>;
}

/** Props every Pixy widget receives. */
export interface WidgetBaseProps {
  /** Deep link the whole widget opens, for example `pixy://calendar`. */
  url: string;
  title: string;
  /** Logged days over days so far, for example `3/7`. */
  subtitle: string;
  light: WidgetSchemeColors;
  dark: WidgetSchemeColors;
}

/**
 * Week widget props. `weeks` holds `WEEK_WIDGET_WEEKS` rows of seven days,
 * oldest first; the last row is the current week. Small shows every row,
 * medium shows the current week only.
 */
export interface WeekWidgetProps extends WidgetBaseProps {
  weeks: WidgetCell[][];
}

/** Month widget props. Every row in `weeks` has seven entries. */
export interface MonthWidgetProps extends WidgetBaseProps {
  /** Rows of seven; `PAD_CELL` fills days outside the month. */
  weeks: WidgetCell[][];
}

/** Day code in the year grid. Kept short: 372 cells per timeline entry. */
export type YearDayCode = WidgetRating | "" | "f" | "p";

/**
 * Year grid, rendered by the app into a PNG. One column per week, seven
 * codes per column in locale weekday order: a rating, `""` for a past day
 * without entry, `"f"` for a future day, `"p"` for padding outside the year.
 */
export interface YearGrid {
  columns: YearDayCode[][];
  /** Today's position: 0-based week column and weekday row. */
  today: { column: number; row: number };
  /** Every real day, for the logged-days subtitle. */
  cells: WidgetCell[];
  /** Mini calendars for the large family: rows of seven codes, `"p"` pads. */
  months: { label: string; weeks: YearDayCode[][]; today: number }[];
}

/**
 * Year widget props. The widget shows one image per color scheme: 372
 * SwiftUI cells exceed the 30 MB widget extension limit, an image does not.
 * `imageLight` and `imageDark` are `file://` URIs in `widgetsDirectory`, or
 * `""` before the first capture.
 */
export interface YearWidgetProps extends WidgetBaseProps {
  /** One band of the trailing `YEAR_BAND_WEEKS` week columns, for the medium family. */
  imageLight: string;
  imageDark: string;
  /** Twelve mini month calendars, for the large family. */
  imageLightLarge: string;
  imageDarkLarge: string;
  /** Changes with every capture so the widget re-reads the file. */
  imageVersion: number;
}
