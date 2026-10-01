import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useCalendarFilters } from "@/features/calendar";
import { t } from "@/lib/translation";

// Android renders only image icons at the menu root; iOS uses the SF Symbol.
const MENU_ICON =
  Platform.OS === "ios"
    ? ("ellipsis.circle" as const)
    : require("../../assets/images/icons/more-horizontal.png");

/**
 * Calendar header menu: native `UIMenu` on iOS, Material dropdown on Android.
 *
 * Opens the filter sheet and jumps to the Statistics and Settings tabs. The
 * active filter count shows as a badge on the icon and in the Filters label.
 * Must render inside the calendar page: `Stack.Toolbar` sets options of the
 * current route. Web keeps the header filter button instead.
 */
export const CalendarHeaderMenu = () => {
  const router = useRouter();
  const calendarFilters = useCalendarFilters();
  const { filterCount, isFiltering } = calendarFilters.data;
  const filtersLabel = isFiltering
    ? `${t("calendar_filters")} (${filterCount})`
    : t("calendar_filters");

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon={MENU_ICON} accessibilityLabel={t("more")}>
        {isFiltering && (
          <Stack.Toolbar.Badge>{`${filterCount}`}</Stack.Toolbar.Badge>
        )}
        <Stack.Toolbar.MenuAction
          icon="line.3.horizontal.decrease.circle"
          onPress={() => calendarFilters.open()}
        >
          {filtersLabel}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon="chart.pie"
          onPress={() => router.navigate("/statistics")}
        >
          {t("statistics")}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon="gearshape"
          onPress={() => router.navigate("/settings")}
        >
          {t("settings")}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
};
