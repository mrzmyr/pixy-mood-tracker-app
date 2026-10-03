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
  /** Fill for a past day without an entry. */
  empty: string;
  /** Fill for a day after today. */
  future: string;
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

/** Week widget props. `days` always has seven entries. */
export interface WeekWidgetProps extends WidgetBaseProps {
  /** Seven days starting on the locale's first weekday. */
  days: (WidgetCell & { label: string })[];
}

/** Month widget props. Every row in `weeks` has seven entries. */
export interface MonthWidgetProps extends WidgetBaseProps {
  /** Short weekday labels in week order. */
  weekdays: string[];
  /** Rows of seven; `PAD_CELL` fills days outside the month. */
  weeks: WidgetCell[][];
}

/** Day code in the year grid. Kept short: 372 cells per timeline entry. */
export type YearDayCode = WidgetRating | "" | "f" | "p";

/**
 * Year grid, rendered by the app into a PNG. Twelve rows of 31 codes: a
 * rating, `""` for a past day without entry, `"f"` for a future day, `"p"`
 * for padding.
 */
export interface YearGrid {
  /** Short month labels, January first. */
  monthLabels: string[];
  months: YearDayCode[][];
  /** Today's position: 0-based month, 1-based day. */
  today: { month: number; day: number };
  /** Every real day, for the logged-days subtitle. */
  cells: WidgetCell[];
}

/**
 * Year widget props. The widget shows one image per color scheme: 372
 * SwiftUI cells exceed the 30 MB widget extension limit, an image does not.
 * `imageLight` and `imageDark` are `file://` URIs in `widgetsDirectory`, or
 * `""` before the first capture.
 */
export interface YearWidgetProps extends WidgetBaseProps {
  imageLight: string;
  imageDark: string;
  /** Changes with every capture so the widget re-reads the file. */
  imageVersion: number;
}
