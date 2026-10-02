import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";

/**
 * Logged days (distinct local dates) that trigger the widget nudge. Day 3 is
 * the first sign of a habit; day 4 catches users who skipped it on day 3
 * (for example when the store review prompt fired instead).
 */
export const WIDGET_NUDGE_DAYS = [3, 4];

/** Settings action recorded once the nudge was shown. */
export const WIDGET_NUDGE_ACTION = "widget_nudge";

/** Wait after a save so the calendar settles before the guide slides up. */
export const WIDGET_NUDGE_DELAY_MS = 1200;

/** Number of distinct local days with at least one entry. */
export const countLoggedDays = (items: LogItem[]) =>
  new Set(items.map(getItemDate)).size;

/** Inputs for {@link shouldShowWidgetNudge}. */
export interface WidgetNudgeInput {
  /** Distinct logged days, including the entry just saved. */
  loggedDays: number;
  /** `widget_nudge` action already recorded. */
  isShown: boolean;
  /** Home screen widgets exist on this platform. */
  isWidgetSupported: boolean;
  /** Settings loaded from storage. A failed read must not record the nudge. */
  isSettingsReady: boolean;
}

/** Decide whether to open the widget guide after a save. True once per install. */
export const shouldShowWidgetNudge = ({
  loggedDays,
  isShown,
  isWidgetSupported,
  isSettingsReady,
}: WidgetNudgeInput): boolean =>
  isWidgetSupported &&
  isSettingsReady &&
  !isShown &&
  WIDGET_NUDGE_DAYS.includes(loggedDays);
