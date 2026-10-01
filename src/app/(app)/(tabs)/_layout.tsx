import { NativeTabs } from "expo-router/unstable-native-tabs";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

/**
 * Native system tab bar. Tabs needing a header nest their own Stack. Content
 * scrolls under the tab bar and ends above it. Calendar handles its own
 * insets, because native insets break FlashList's start-at-end position.
 */
const TabsLayout = () => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <NativeTabs
      backgroundColor={colors.tabsBackground}
      iconColor={{
        default: colors.tabsIconInactive,
        selected: colors.tabsIconActive,
      }}
      labelStyle={{
        default: { color: colors.tabsTextInactive },
        selected: { color: colors.tabsTextActive },
      }}
      tintColor={colors.tabsIconActive}
      screenListeners={{
        tabPress: () => {
          void haptics.selection();
        },
      }}
    >
      <NativeTabs.Trigger name="statistics" testID="statistics">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.pie", selected: "chart.pie.fill" }}
          md="pie_chart"
        />
        <NativeTabs.Trigger.Label>{t("statistics")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="calendar"
        testID="calendar"
        disableAutomaticContentInsets
      >
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>{t("calendar")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" testID="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>{t("settings")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

export default TabsLayout;
