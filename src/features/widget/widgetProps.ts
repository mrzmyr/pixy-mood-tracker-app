import type { LogItem } from "@/features/logs";

/** Mood rating key, as stored on an entry. */
export type WidgetRating = LogItem["rating"];

/** One day in a widget grid. */
export interface WidgetCell {
  /** Day of month, 1 to 31. */
  day: number;
  /** Average rating of the day's entries; `null` when nothing was logged. */
  rating: WidgetRating | null;
  isToday: boolean;
  /** After today: drawn lighter, never counted as missing. */
  isFuture: boolean;
}

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
  /** Rows of seven; `null` pads days outside the month. */
  weeks: (WidgetCell | null)[][];
}

/** Year widget props. `months` has twelve rows of 31 entries. */
export interface YearWidgetProps extends WidgetBaseProps {
  /** Short month labels, January first. */
  monthLabels: string[];
  /** Twelve rows of 31; `null` pads short months. */
  months: (WidgetCell | null)[][];
}
