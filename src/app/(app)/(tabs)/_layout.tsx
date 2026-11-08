import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

/**
 * Native bottom tabs: Home and Calendar. Liquid Glass tab bar on iOS 26,
 * Material navigation bar on Android. Flag `home-week` off: Home is hidden
 * and so is the tab bar, Calendar looks like before.
 */
const TabsLayout = () => {
  const colors = useColors();
  const isHomeEnabled = useFeatureFlag("home-week");

  return (
    <NativeTabs
      hidden={!isHomeEnabled}
      tintColor={colors.text}
      {...(Platform.OS === "android" && {
        backgroundColor: colors.tabsBackground,
      })}
    >
      <NativeTabs.Trigger name="home" hidden={!isHomeEnabled} testID="tab-home">
        <NativeTabs.Trigger.Icon sf="list.bullet" md="view_agenda" />
        <NativeTabs.Trigger.Label>{t("today")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar" testID="tab-calendar">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>{t("calendar")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

export default TabsLayout;
