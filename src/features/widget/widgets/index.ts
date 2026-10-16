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
import type { YearImages } from "../widgetData";
import type PixyMonthWidget from "./PixyMonthWidget";
import type PixyWeekWidget from "./PixyWeekWidget";
import type PixyYearWidget from "./PixyYearWidget";

/** SwiftUI views load only when iOS actually syncs widgets. */
const loadWidgets = () => ({
  // SAFETY: local widget modules export these SDK widget objects as their defaults.
  // oxlint-disable-next-line typescript/no-require-imports -- native SwiftUI views cannot load on web.
  PixyMonthWidget: require("./PixyMonthWidget")
    .default as typeof PixyMonthWidget,
  // SAFETY: same local default export contract.
  // oxlint-disable-next-line typescript/no-require-imports -- native SwiftUI views cannot load on web.
  PixyWeekWidget: require("./PixyWeekWidget").default as typeof PixyWeekWidget,
  // SAFETY: same local default export contract.
  // oxlint-disable-next-line typescript/no-require-imports -- native SwiftUI views cannot load on web.
  PixyYearWidget: require("./PixyYearWidget").default as typeof PixyYearWidget,
});

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
  const { PixyWeekWidget, PixyMonthWidget, PixyYearWidget } = loadWidgets();
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
  isAvailable,
  yearImages,
}: {
  items: LogItem[];
  scaleType: string;
  /** Feature flag on. `false` makes every widget show "Not available". */
  isAvailable: boolean;
  /** Captured year images; omitted when the capture failed. */
  yearImages?: YearImages;
}) => {
  if (!IS_WIDGET_SUPPORTED) {
    return;
  }
  try {
    const { PixyWeekWidget, PixyMonthWidget, PixyYearWidget } = loadWidgets();
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
