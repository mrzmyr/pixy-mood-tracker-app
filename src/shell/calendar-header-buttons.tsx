import dayjs from "dayjs";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import {
  useCalendarFilters,
  useCalendarFiltersSheet,
  useIsCalendarIntroActive,
} from "@/features/calendar";
import { DATE_FORMAT } from "@/constants/config";
import { ProfileHeaderButton } from "@/features/profile";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import { useViewMenu } from "./view-menu";

// Android renders only image icons in the header; iOS uses SF Symbols.
const ICONS =
  Platform.OS === "ios"
    ? ({
        filters: "line.3.horizontal.decrease",
        statistics: "chart.pie",
      } as const)
    : {
        filters: require("../../assets/images/icons/filter.png"),
        statistics: require("../../assets/images/icons/statistics.png"),
      };

/**
 * Calendar header buttons: Statistics on the left; Filters and Settings on
 * the right. With the `recaps` flag, the left button opens this week's
 * Recaps, which carry every statistics card. Settings is the user's avatar:
 * photo, initials, or a gray silhouette. With more than one view
 * (`useViewMenu`: Day with `home-week`, Timeline with `calendar-timeline`),
 * Filters is a menu: it opens the filter sheet and holds the View picker
 * (Day, Calendar, Timeline). Otherwise Filters opens the sheet.
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
  const viewMenu = useViewMenu("calendar");
  const isRecapsEnabled = useFeatureFlag("recaps");
  const openStatistics = () =>
    isRecapsEnabled
      ? router.navigate({
          pathname: "/recaps/[kind]/[date]",
          params: { kind: "month", date: dayjs().format(DATE_FORMAT) },
        })
      : router.navigate("/statistics");
  // The calendar intro shows the buttons after the pixels.
  const isIntroActive = useIsCalendarIntroActive();

  if (isIntroActive) {
    return null;
  }

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
        {viewMenu.isEnabled ? (
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
              {viewMenu.items.map((item) => (
                <Stack.Toolbar.MenuAction
                  key={item.key}
                  isOn={item.isOn}
                  onPress={item.handlePress}
                >
                  {item.label}
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
        <Stack.Toolbar.View>
          <ProfileHeaderButton />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
};
