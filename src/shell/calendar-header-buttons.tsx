import dayjs from "dayjs";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import {
  getCalendarLayoutLabel,
  useCalendarFilters,
  useCalendarFiltersSheet,
  useCalendarLayout,
} from "@/features/calendar";
import { DATE_FORMAT } from "@/constants/config";
import { ProfileHeaderButton } from "@/features/profile";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

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
 * (cog icon) on the right. With the `recaps` flag, the left button opens
 * this week's Recaps, which carry every statistics card. With the `profile` flag, the user's avatar
 * replaces the cog: photo, initials, or a gray silhouette. With the
 * `calendar-timeline` flag on, Filters is a menu: it opens the filter sheet
 * and holds the layout picker (Calendar, Timeline). With the flag off,
 * Filters opens the sheet.
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
  const filtersSheet = useCalendarFiltersSheet();
  const calendarLayout = useCalendarLayout();
  const isProfileEnabled = useFeatureFlag("profile");
  const isRecapsEnabled = useFeatureFlag("recaps");
  const openSettings = () => router.navigate("/settings");
  const openStatistics = () =>
    isRecapsEnabled
      ? router.navigate({
          pathname: "/recaps/[kind]/[date]",
          params: { kind: "week", date: dayjs().format(DATE_FORMAT) },
        })
      : router.navigate("/statistics");

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={ICONS.statistics}
          accessibilityLabel={isRecapsEnabled ? t("recaps") : t("statistics")}
          onPress={openStatistics}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {calendarLayout.isEnabled ? (
          <Stack.Toolbar.Menu
            icon={ICONS.filters}
            accessibilityLabel={t("calendar_filters")}
            separateBackground
          >
            {isFiltering && (
              <Stack.Toolbar.Badge>{`${filterCount}`}</Stack.Toolbar.Badge>
            )}
            <Stack.Toolbar.MenuAction
              icon={ICONS.filters}
              onPress={() => filtersSheet.open()}
            >
              {isFiltering
                ? `${t("calendar_filters_open")} (${filterCount})`
                : t("calendar_filters_open")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title={t("calendar_view")}>
              {calendarLayout.availableLayouts.map((layout) => (
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
            onPress={() => filtersSheet.open()}
            separateBackground
          >
            {isFiltering && (
              <Stack.Toolbar.Badge>{`${filterCount}`}</Stack.Toolbar.Badge>
            )}
          </Stack.Toolbar.Button>
        )}
        {/* Direct child only: Stack.Toolbar drops Fragments. Filters sets
            `separateBackground`, so the avatar gets its own glass circle. */}
        {isProfileEnabled ? (
          <Stack.Toolbar.View>
            <ProfileHeaderButton onPress={openSettings} />
          </Stack.Toolbar.View>
        ) : (
          <Stack.Toolbar.Button
            icon={ICONS.settings}
            accessibilityLabel={t("settings")}
            onPress={openSettings}
            separateBackground
          />
        )}
      </Stack.Toolbar>
    </>
  );
};
