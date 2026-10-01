import { Tabs } from "expo-router/js-tabs";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { MyTabBar } from "@/shell/MyTabBar";

const renderTabBar = (props: React.ComponentProps<typeof MyTabBar>) => (
  <MyTabBar {...props} />
);

/**
 * Tabs retain custom bar and frozen offscreen screens. No tab shows the JS
 * header: calendar nests a native Stack for its header and menu, statistics
 * and settings draw their own.
 */
const TabsLayout = () => {
  const colors = useColors();
  const defaultOptions = {
    headerShown: false,
    tabBarStyle: { borderTopColor: colors.headerBorder },
  };
  return (
    <Tabs
      initialRouteName="calendar"
      screenOptions={{ freezeOnBlur: true }}
      tabBar={renderTabBar}
    >
      <Tabs.Screen
        name="statistics"
        options={{
          ...defaultOptions,
          tabBarButtonTestID: "statistics",
          title: t("statistics"),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          ...defaultOptions,
          tabBarButtonTestID: "calendar",
          title: t("calendar"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          ...defaultOptions,
          tabBarButtonTestID: "settings",
          title: t("settings"),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
