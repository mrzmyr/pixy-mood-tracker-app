import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import type { LogItem } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import {
  getMonthWidgetProps,
  getWeekWidgetProps,
  getWidgetTimeline,
  getYearWidgetProps,
  YEAR_WIDGET_TIMELINE_DAYS,
} from "../widgetData";
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
  const [week, month, year] = await Promise.all([
    PixyWeekWidget.getTimeline(),
    PixyMonthWidget.getTimeline(),
    PixyYearWidget.getTimeline(),
  ]);
  const keys = firstEntryKeys;
  return `week ${week.length} [${keys(week)}] month ${month.length} [${keys(month)}] year ${year.length} [${keys(year)}]`;
};

/**
 * Pushes a fresh timeline to every widget, then reads the store back so
 * Development tools can show what the widgets will render. Never throws: a
 * widget failure must not break the app, so errors go to Sentry.
 */
export const syncWidgets = async ({
  items,
  scaleType,
}: {
  items: LogItem[];
  scaleType: string;
}) => {
  if (!IS_WIDGET_SUPPORTED) {
    return;
  }
  try {
    const input = { items, scaleType, url: getWidgetUrl() };
    PixyWeekWidget.updateTimeline(getWidgetTimeline(input, getWeekWidgetProps));
    PixyMonthWidget.updateTimeline(
      getWidgetTimeline(input, getMonthWidgetProps)
    );
    PixyYearWidget.updateTimeline(
      getWidgetTimeline(input, getYearWidgetProps, YEAR_WIDGET_TIMELINE_DAYS)
    );
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
