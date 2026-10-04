import { useCallback } from "react";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import type { CalendarView } from "@/state/settings";

/** Calendar views in menu order. The first one is the default. */
export const CALENDAR_VIEWS: CalendarView[] = ["average", "all"];

/** Translated menu label. Call during render so it follows the app locale. */
export const getCalendarViewLabel = (view: CalendarView) =>
  t(view === "all" ? "calendar_view_all" : "calendar_view_average");

/**
 * Current calendar view. Behind the `calendar-view` flag: with the flag off,
 * the view is always `average` and the stored choice stays untouched.
 * Unknown stored values fall back to `average`.
 */
export const useCalendarView = () => {
  const isEnabled = useFeatureFlag("calendar-view");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const view: CalendarView =
    isEnabled && settings.calendarView === "all" ? "all" : "average";

  const setView = useCallback(
    (next: CalendarView) => {
      analytics.track("calendar:view_changed", { view: next });
      setSettings((current) => ({ ...current, calendarView: next }));
    },
    [analytics, setSettings]
  );

  return { isEnabled, view, setView };
};
