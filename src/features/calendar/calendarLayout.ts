import { useCallback } from "react";
import { Platform } from "react-native";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import type { CalendarLayout } from "@/state/settings";

/** Calendar layouts in menu order. The first one is the default. */
const CALENDAR_LAYOUTS: CalendarLayout[] = ["calendar", "timeline", "map"];

/** The map needs Apple Maps: `expo-maps` is linked on iOS only. */
const HAS_MAP = Platform.OS === "ios";

const LABEL_KEYS = {
  calendar: "calendar",
  timeline: "calendar_view_timeline",
  map: "calendar_view_map",
} as const;

/** Translated menu label. Call during render so it follows the app locale. */
export const getCalendarLayoutLabel = (layout: CalendarLayout) =>
  t(LABEL_KEYS[layout]);

/**
 * Current calendar screen layout. `timeline` is behind the
 * `calendar-timeline` flag, `map` behind `calendar-map` (iOS only). A stored
 * layout that is not available shows as `calendar`; the stored choice stays
 * untouched.
 */
export const useCalendarLayout = () => {
  const isTimelineEnabled = useFeatureFlag("calendar-timeline");
  const isMapEnabled = useFeatureFlag("calendar-map") && HAS_MAP;
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const availableLayouts = CALENDAR_LAYOUTS.filter(
    (layout) =>
      layout === "calendar" ||
      (layout === "timeline" && isTimelineEnabled) ||
      (layout === "map" && isMapEnabled)
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
