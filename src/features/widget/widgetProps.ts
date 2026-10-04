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
  /** Check mark color on each rating fill. */
  ratingTexts: Record<WidgetRating, string>;
}

/** Props every Pixy widget receives. */
export interface WidgetBaseProps {
  /** `false` when the feature flag is off: the widget shows `unavailableText`. */
  isAvailable: boolean;
  unavailableText: string;
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
 * Year widget props. The widget shows image rows the app captured: 372
 * SwiftUI cells exceed the 30 MB widget extension limit, a few images do
 * not. Each array holds `file://` URIs in `widgetsDirectory`, top row first,
 * and stays empty until the first capture.
 */
export interface YearWidgetProps extends WidgetBaseProps {
  /** Medium: 7 weekday rows of the trailing weeks. */
  rowsLight: string[];
  rowsDark: string[];
  /** Large: 3 rows of 4 month calendars. */
  rowsLightLarge: string[];
  rowsDarkLarge: string[];
  /** Changes with every capture so the widget re-reads the files. */
  imageVersion: number;
}

/** One mood tap on the check-in widget, waiting for the app to import it. */
export interface CheckInTap {
  rating: WidgetRating;
  /** Tap time in epoch milliseconds. Also derives the entry id. */
  at: number;
}

/**
 * Check-in widget props. A tap runs in the widget extension, never in the
 * app: the button handler appends to `taps` and sets `selected`, and the app
 * turns `taps` into entries on its next start or foreground.
 */
export interface CheckInWidgetProps extends WidgetBaseProps {
  /** Rating with the check mark: last tap, else today's latest entry, else `""`. */
  selected: WidgetRating | "";
  /** Taps the app has not imported yet, oldest first. */
  taps: CheckInTap[];
  /** Reminder time like `20:30`; `""` when reminders are off. */
  reminderTime: string;
  /** Accessibility label per rating, like "Mood 3 of 7". Never a rating word. */
  ratingLabels: Record<WidgetRating, string>;
  /** Tap time in epoch milliseconds while the success line shows; `0` otherwise. */
  savedAt: number;
  /** Success line after a tap, the same for every rating. */
  savedText: string;
  /** Hint under the success line: tapping the card shows the buttons again. */
  againText: string;
}
