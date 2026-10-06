import { useCallback } from "react";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import type { CalendarLayout } from "@/state/settings";

/** Calendar layouts in menu order. The first one is the default. */
export const CALENDAR_LAYOUTS: CalendarLayout[] = ["calendar", "timeline"];

/** Translated menu label. Call during render so it follows the app locale. */
export const getCalendarLayoutLabel = (layout: CalendarLayout) =>
  t(layout === "timeline" ? "calendar_view_timeline" : "calendar");

/**
 * Current calendar screen layout. Behind the `calendar-timeline` flag: with
 * the flag off, the layout is always `calendar` and the stored choice stays
 * untouched.
 */
export const useCalendarLayout = () => {
  const isEnabled = useFeatureFlag("calendar-timeline");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const layout: CalendarLayout =
    isEnabled && settings.calendarLayout === "timeline"
      ? "timeline"
      : "calendar";

  const setLayout = useCallback(
    (next: CalendarLayout) => {
      analytics.track("calendar:layout_changed", { layout: next });
      setSettings((current) => ({ ...current, calendarLayout: next }));
    },
    [analytics, setSettings]
  );

  return { isEnabled, layout, setLayout };
};
