import { useCallback } from "react";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSettings } from "@/state/settings";
import type { CalendarLayout } from "@/state/settings";

/** Calendar layouts in menu order. The first one is the default. */
const CALENDAR_LAYOUTS: CalendarLayout[] = ["calendar", "timeline"];

const LABEL_KEYS = {
  calendar: "calendar",
  timeline: "calendar_view_timeline",
} as const;

/** Translated menu label. Call during render so it follows the app locale. */
export const getCalendarLayoutLabel = (layout: CalendarLayout) =>
  t(LABEL_KEYS[layout]);

/**
 * Current calendar screen layout. `timeline` is behind the
 * `calendar-timeline` flag. A stored layout that is not available shows as
 * `calendar`; the stored choice stays untouched.
 */
export const useCalendarLayout = () => {
  const isTimelineEnabled = useFeatureFlag("calendar-timeline");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const availableLayouts = CALENDAR_LAYOUTS.filter(
    (layout) => layout === "calendar" || isTimelineEnabled
  );
  const layout: CalendarLayout = availableLayouts.includes(
    settings.calendarLayout
  )
    ? settings.calendarLayout
    : "calendar";

  const setLayout = useCallback(
    (next: CalendarLayout) => {
      analytics.track("calendar:layout_changed", { layout: next });
      setSettings((current) => ({ ...current, calendarLayout: next }));
    },
    [analytics, setSettings]
  );

  return {
    /** More than one layout to pick from: show the layout picker. */
    isEnabled: availableLayouts.length > 1,
    availableLayouts,
    layout,
    setLayout,
  };
};
