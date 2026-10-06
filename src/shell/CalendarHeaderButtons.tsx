import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import {
  CALENDAR_LAYOUTS,
  getCalendarLayoutLabel,
  useCalendarFilters,
  useCalendarLayout,
} from "@/features/calendar";
import { t } from "@/lib/translation";

// Android renders only image icons in the header; iOS uses SF Symbols.
const ICONS =
  Platform.OS === "ios"
    ? ({
        filters: "line.3.horizontal.decrease",
        statistics: "chart.pie",
        settings: "gearshape",
      } as const)
    : {
        filters: require("../../assets/images/icons/filter.png"),
        statistics: require("../../assets/images/icons/statistics.png"),
        settings: require("../../assets/images/icons/settings.png"),
      };

/**
 * Calendar header buttons: Statistics on the left; Filters and Settings
 * (cog icon) on the right. With the `calendar-timeline` flag on, Filters is
 * a menu: it opens the filter sheet and holds the layout picker (Calendar,
 * Timeline). With the flag off, Filters opens the sheet.
 *
 * Native header items: Liquid Glass buttons on iOS 26 (floating over the
 * calendar, see `HAS_FLOATING_HEADER`), Material icon buttons on Android.
 * Native items have no test IDs, so e2e flows tap them by accessibility
 * label. The active filter count shows as a badge on Filters.
 * Must render inside the calendar page: `Stack.Toolbar` sets options of the
 * current route. Web has no native header, so it shows no buttons.
 */
export const CalendarHeaderButtons = () => {
  const router = useRouter();
  const calendarFilters = useCalendarFilters();
  const { filterCount, isFiltering } = calendarFilters.data;
  const calendarLayout = useCalendarLayout();

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={ICONS.statistics}
          accessibilityLabel={t("statistics")}
          onPress={() => router.navigate("/statistics")}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {calendarLayout.isEnabled ? (
          <Stack.Toolbar.Menu
            icon={ICONS.filters}
            accessibilityLabel={t("calendar_filters")}
          >
            {isFiltering && (
              <Stack.Toolbar.Badge>{`${filterCount}`}</Stack.Toolbar.Badge>
            )}
            <Stack.Toolbar.MenuAction
              icon={ICONS.filters}
              onPress={() => calendarFilters.open()}
            >
              {isFiltering
                ? `${t("calendar_filters_open")} (${filterCount})`
                : t("calendar_filters_open")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title={t("calendar_view")}>
              {CALENDAR_LAYOUTS.map((layout) => (
                <Stack.Toolbar.MenuAction
                  key={layout}
                  isOn={calendarLayout.layout === layout}
                  onPress={() => calendarLayout.setLayout(layout)}
                >
                  {getCalendarLayoutLabel(layout)}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        ) : (
          <Stack.Toolbar.Button
            icon={ICONS.filters}
            accessibilityLabel={t("calendar_filters")}
            onPress={() => calendarFilters.open()}
          >
            {isFiltering && (
              <Stack.Toolbar.Badge>{`${filterCount}`}</Stack.Toolbar.Badge>
            )}
          </Stack.Toolbar.Button>
        )}
        <Stack.Toolbar.Button
          icon={ICONS.settings}
          accessibilityLabel={t("settings")}
          onPress={() => router.navigate("/settings")}
          separateBackground
        />
      </Stack.Toolbar>
    </>
  );
};
