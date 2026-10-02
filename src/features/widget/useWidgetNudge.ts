import { useRouter } from "expo-router";
import type { LogItem } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { IS_WIDGET_SUPPORTED } from "./widgets";
import {
  WIDGET_NUDGE_ACTION,
  WIDGET_NUDGE_DELAY_MS,
  countLoggedDays,
  shouldShowWidgetNudge,
} from "./widgetNudge";

/**
 * Returns a callback for the logger save flow. It opens the widget guide
 * once, after the save that completes the 3rd (or 4th) logged day.
 * Returns whether the guide was scheduled, so callers can avoid stacking
 * it on another prompt.
 */
export const useWidgetNudge = () => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { settings, hasActionDone, addActionDone } = useSettings();
  const settingsLoad = useSettingsLoad();

  return (items: LogItem[]): boolean => {
    const loggedDays = countLoggedDays(items);
    const shouldShow = shouldShowWidgetNudge({
      loggedDays,
      isShown: hasActionDone(WIDGET_NUDGE_ACTION),
      isWidgetSupported: IS_WIDGET_SUPPORTED,
      isSettingsReady: settingsLoad.status === "ready" && settings.loaded,
    });
    if (!shouldShow) {
      return false;
    }
    // Record first: the nudge counts as shown even when the user closes it.
    addActionDone(WIDGET_NUDGE_ACTION);
    analytics.track("widget:nudge_shown", { days_count: loggedDays });
    setTimeout(() => {
      router.push({ pathname: "/widget", params: { source: "nudge" } });
    }, WIDGET_NUDGE_DELAY_MS);
    return true;
  };
};
