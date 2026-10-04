import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import type { LogItem } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { collectCheckInTaps } from "../checkIn";
import {
  getCheckInWidgetProps,
  getMonthWidgetProps,
  getWeekWidgetProps,
  getWidgetTimeline,
  getYearWidgetProps,
  YEAR_WIDGET_TIMELINE_DAYS,
} from "../widgetData";
import type { YearImages } from "../widgetData";
import type { CheckInTap } from "../widgetProps";
import PixyCheckInWidget from "./PixyCheckInWidget";
import PixyMonthWidget from "./PixyMonthWidget";
import PixyWeekWidget from "./PixyWeekWidget";
import PixyYearWidget from "./PixyYearWidget";

/** Home screen widgets exist on iOS only. */
export const IS_WIDGET_SUPPORTED = Platform.OS === "ios";

/** Result of the last {@link syncWidgets} call, for Development tools. */
export interface WidgetSyncStatus {
  at: string;
  status: "ok" | "failed";
  /** Why the sync failed, or the read-back summary on success. */
  why: string;
}

let lastSync: WidgetSyncStatus | null = null;

/** Last sync result; `null` before the first sync of this app run. */
export const getWidgetSyncStatus = () => lastSync;

/** Deep link every widget opens: the calendar of the installed variant. */
export const getWidgetUrl = () => {
  const scheme = Constants.expoConfig?.scheme;
  const first = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${first ?? "pixy"}://calendar`;
};

const firstEntryKeys = (entries: { props: object }[]) =>
  Object.keys(entries[0]?.props ?? {}).join(",");

/** Entry counts and first-entry keys read back from the widget store. */
const describeTimelines = async () => {
  const [week, month, year, checkIn] = await Promise.all([
    PixyWeekWidget.getTimeline(),
    PixyMonthWidget.getTimeline(),
    PixyYearWidget.getTimeline(),
    PixyCheckInWidget.getTimeline(),
  ]);
  const keys = firstEntryKeys;
  return `week ${week.length} [${keys(week)}] month ${month.length} [${keys(month)}] year ${year.length} [${keys(year)}] check-in ${checkIn.length} [${keys(checkIn)}]`;
};

/**
 * Mood taps stored by the check-in widget, oldest first. Throws when the
 * widget store cannot be read; the caller must then skip the check-in write,
 * or pending taps are lost.
 */
export const readCheckInTaps = async (): Promise<CheckInTap[]> => {
  if (!IS_WIDGET_SUPPORTED) {
    return [];
  }
  return collectCheckInTaps(await PixyCheckInWidget.getTimeline());
};

/**
 * Pushes a fresh timeline to every widget, then reads the store back so
 * Development tools can show what the widgets will render. Never throws: a
 * widget failure must not break the app, so errors go to Sentry.
 */
export const syncWidgets = async ({
  items,
  scaleType,
  isAvailable,
  yearImages,
  reminderTime,
  checkInTaps,
}: {
  items: LogItem[];
  scaleType: string;
  /** `HH:mm`, or `null` when reminders are off. */
  reminderTime: string | null;
  /**
   * Taps not imported yet, kept in the check-in widget. `null` when the
   * widget store could not be read: the check-in timeline is left alone.
   */
  checkInTaps: CheckInTap[] | null;
  /** Feature flag on. `false` makes every widget show "Not available". */
  isAvailable: boolean;
  /** Captured year images; omitted when the capture failed. */
  yearImages?: YearImages;
}) => {
  if (!IS_WIDGET_SUPPORTED) {
    return;
  }
  try {
    const input = { items, scaleType, url: getWidgetUrl(), isAvailable };
    PixyWeekWidget.updateTimeline(getWidgetTimeline(input, getWeekWidgetProps));
    PixyMonthWidget.updateTimeline(
      getWidgetTimeline(input, getMonthWidgetProps)
    );
    PixyYearWidget.updateTimeline(
      getWidgetTimeline(
        input,
        (entryInput) => getYearWidgetProps(entryInput, yearImages),
        YEAR_WIDGET_TIMELINE_DAYS
      )
    );
    if (checkInTaps !== null) {
      PixyCheckInWidget.updateTimeline(
        getWidgetTimeline(input, (entryInput) =>
          getCheckInWidgetProps({
            ...entryInput,
            reminderTime,
            taps: checkInTaps,
          })
        )
      );
    }
    lastSync = {
      at: new Date().toISOString(),
      status: "ok",
      why: await describeTimelines(),
    };
  } catch (error) {
    const structuredError = createStructuredError({
      status: "widget_sync_failed",
      message: "Home screen widgets could not be updated",
      why: `expo-widgets failed: ${error instanceof Error ? error.message : String(error)}`,
      fix: "Open Pixy again; widgets refresh on every start",
    });
    lastSync = {
      at: new Date().toISOString(),
      status: "failed",
      why: structuredError.why,
    };
    console.error(structuredError);
    Sentry.captureException(structuredError);
  }
};
