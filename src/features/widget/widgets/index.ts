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
} from "../widgetData";
import PixyMonthWidget from "./PixyMonthWidget";
import PixyWeekWidget from "./PixyWeekWidget";
import PixyYearWidget from "./PixyYearWidget";

/** Home screen widgets exist on iOS only. */
export const IS_WIDGET_SUPPORTED = Platform.OS === "ios";

/** Deep link every widget opens: the calendar of the installed variant. */
export const getWidgetUrl = () => {
  const scheme = Constants.expoConfig?.scheme;
  const first = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${first ?? "pixy"}://calendar`;
};

/**
 * Pushes a fresh timeline to every widget. Never throws: a widget failure
 * must not break the app, so errors go to Sentry.
 */
export const syncWidgets = ({
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
    PixyYearWidget.updateTimeline(getWidgetTimeline(input, getYearWidgetProps));
  } catch (error) {
    const structuredError = createStructuredError({
      status: "widget_sync_failed",
      message: "Home screen widgets could not be updated",
      why: `expo-widgets failed: ${error instanceof Error ? error.message : String(error)}`,
      fix: "Open Pixy again; widgets refresh on every start",
    });
    console.error(structuredError);
    Sentry.captureException(structuredError);
  }
};
