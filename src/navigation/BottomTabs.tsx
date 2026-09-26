import LinkButton from "@/components/LinkButton";
import { t } from "@/helpers/translation";
import { useCalendarFilters } from "@/hooks/useCalendarFilters";
import useColors from "@/hooks/useColors";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View } from "react-native";
import { Filter } from "react-native-feather";
import { SettingsScreen } from "@/screens/Settings";
import { StatisticsScreen } from "@/screens/Statistics";
import CalendarScreen from "@/screens/Calendar";
import { MyTabBar } from "./MyTabBar";

const Tab = createBottomTabNavigator();

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

const renderCalendarHeaderRight = () => <CalendarFiltersHeaderButton />;

const renderTabBar = (props: BottomTabBarProps) => <MyTabBar {...props} />;

/**
 * Bottom tab navigator (Statistics, Calendar, Settings), opening on
 * Calendar. Must render inside `CalendarFiltersProvider` for the calendar
 * filter header button.
 */
export const BottomTabs = () => {
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
    tabBarStyle: {
      borderTopColor: colors.headerBorder,
    },
  };

  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      screenOptions={() => ({
        headerStyle: {
          borderBottomColor: "#fff",
        },
        // Hidden tabs skip renders until focused again. Otherwise a visited
        // Statistics tab recomputes its charts on every saved entry.
        freezeOnBlur: true,
      })}
      tabBar={renderTabBar}
    >
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={() => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: "statistics",
          title: t("statistics"),
        })}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={() => ({
          ...defaultOptions,
          headerRight: renderCalendarHeaderRight,
          tabBarTestID: "calendar",
          title: t("calendar"),
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={() => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: "settings",
          title: t("settings"),
        })}
      />
    </Tab.Navigator>
  );
};
