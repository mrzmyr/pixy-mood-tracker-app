import { Tabs } from "expo-router/js-tabs";
import { Filter } from "react-native-feather";
import { Platform, View } from "react-native";
import LinkButton from "@/components/LinkButton";
import {
  CalendarViewMenu,
  useCalendarFilters,
  useCalendarView,
} from "@/features/calendar";
import { useAnalytics } from "@/state/analytics";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { MyTabBar } from "@/shell/MyTabBar";

const CalendarFiltersHeaderButton = () => {
  const calendarFilters = useCalendarFilters();
  return (
    <View style={{ paddingRight: 16 }}>
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
/** View menu, behind the `calendar-views` flag, then Filters. */
const CalendarHeaderRight = () => {
  const calendarView = useCalendarView();
  const analytics = useAnalytics();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {calendarView.isEnabled && (
        <CalendarViewMenu
          view={calendarView.view}
          onChange={(view) => {
            if (view === calendarView.view) {
              return;
            }
            analytics.track("calendar:view_changed", { view, source: "menu" });
            calendarView.show({ view });
          }}
        />
      )}
      <CalendarFiltersHeaderButton />
    </View>
  );
};
const renderCalendarHeaderRight = () => <CalendarHeaderRight />;

const renderTabBar = (props: React.ComponentProps<typeof MyTabBar>) => (
  <MyTabBar {...props} />
);

/** Tabs retain custom bar and frozen offscreen screens. */
const TabsLayout = () => {
  const colors = useColors();
  const defaultOptions = {
    headerTintColor: colors.text,
    headerStyle: {
      backgroundColor: colors.background,
      shadowColor: "transparent",
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
    },
    headerShadowVisible: Platform.OS !== "web",
    tabBarStyle: { borderTopColor: colors.headerBorder },
  };
  return (
    <Tabs
      initialRouteName="calendar"
      screenOptions={{
        freezeOnBlur: true,
        headerStyle: { borderBottomColor: "#fff" },
      }}
      tabBar={renderTabBar}
    >
      <Tabs.Screen
        name="statistics"
        options={{
          ...defaultOptions,
          headerShown: false,
          tabBarButtonTestID: "statistics",
          title: t("statistics"),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          ...defaultOptions,
          headerRight: renderCalendarHeaderRight,
          tabBarButtonTestID: "calendar",
          title: t("calendar"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          ...defaultOptions,
          headerShown: false,
          tabBarButtonTestID: "settings",
          title: t("settings"),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
