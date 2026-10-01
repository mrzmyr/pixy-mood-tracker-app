import { Stack } from "expo-router";
import { Filter } from "react-native-feather";
import { Platform, View } from "react-native";
import LinkButton from "@/components/LinkButton";
import { useCalendarFilters } from "@/features/calendar";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";

/** Web has no native header menu, so it keeps the filter button. */
const WebFiltersHeaderButton = () => {
  const calendarFilters = useCalendarFilters();
  return (
    <View style={{ paddingRight: 16 }}>
      <LinkButton
        onPress={() =>
          calendarFilters.isOpen
            ? calendarFilters.close()
            : calendarFilters.open()
        }
        testID="filters"
        type="primary"
        icon={Filter}
      >
        {t("calendar_filters")}{" "}
        {calendarFilters.data.isFiltering
          ? `(${calendarFilters.data.filterCount})`
          : ""}
      </LinkButton>
    </View>
  );
};
const renderWebHeaderRight = () => <WebFiltersHeaderButton />;

/**
 * Calendar tab nests a native Stack: the tab header is a JS header, and the
 * header menu (`Stack.Toolbar`) renders only in a native stack header.
 */
const CalendarLayout = () => {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        title: t("calendar"),
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: Platform.OS !== "web",
        headerRight: Platform.OS === "web" ? renderWebHeaderRight : undefined,
      }}
    />
  );
};

export default CalendarLayout;
