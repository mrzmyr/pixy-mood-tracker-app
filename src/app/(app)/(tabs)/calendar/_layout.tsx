import { Stack } from "expo-router";
import { Filter } from "react-native-feather";
import { Platform, View } from "react-native";
import LinkButton from "@/components/LinkButton";
import { useCalendarFilters } from "@/features/calendar";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";

const CalendarFiltersHeaderButton = () => {
  const calendarFilters = useCalendarFilters();
  return (
    <View style={{ paddingRight: Platform.OS === "ios" ? 0 : 16 }}>
      <LinkButton
        onPress={() => {
          if (calendarFilters.isOpen) {
            calendarFilters.close();
          } else {
            calendarFilters.open();
          }
        }}
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
const renderCalendarHeaderRight = () => <CalendarFiltersHeaderButton />;

/** Native tabs have no header, so the calendar tab nests a Stack for it. */
const CalendarLayout = () => {
  const colors = useColors();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("calendar"),
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: Platform.OS !== "web",
          headerRight: renderCalendarHeaderRight,
        }}
      />
    </Stack>
  );
};

export default CalendarLayout;
