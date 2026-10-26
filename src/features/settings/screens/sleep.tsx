import { ScrollView, View } from "react-native";
import FlagHighlight from "@/components/flag-highlight";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import Toggle from "@/components/toggle";
import { AppleHealthIcon, useHealthSleepSetting } from "@/features/health";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { StepSwitch } from "../components/step-switch";
import { useStepEnabled } from "../use-step-enabled";

/**
 * Settings > Check-in > Sleep: the step switch, and while the step is on,
 * the switch that fills the sleep quality from Apple Health. The Apple
 * Health switch needs the `apple-health` flag and a device with Apple
 * Health; without them the page holds only the step switch.
 */
export const SettingsSleepScreen = () => {
  const colors = useColors();
  const { enabled } = useStepEnabled("sleep");
  const { isAvailable, isEnabled, setEnabled } = useHealthSleepSetting();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <StepSwitch step="sleep" />
      {enabled && isAvailable && (
        <View style={{ marginHorizontal: 16 }}>
          <MenuListHeadline style={{ marginTop: 16 }}>
            {t("health_section")}
          </MenuListHeadline>
          <FlagHighlight flag="apple-health">
            <MenuList>
              <MenuListItem
                title={t("health_sleep_setting")}
                // Apple's rules: "Apple Health" sits close to the icon,
                // here in the headline right above.
                iconLeft={<AppleHealthIcon size={29} />}
                iconRight={
                  <Toggle
                    accessibilityLabel={t("health_sleep_setting")}
                    testID="health-sleep-enabled"
                    onValueChange={(next) => {
                      void setEnabled(next);
                    }}
                    value={isEnabled}
                  />
                }
              />
            </MenuList>
          </FlagHighlight>
          <TextInfo>{t("health_sleep_setting_description")}</TextInfo>
          {isEnabled && <TextInfo>{t("health_sleep_access_hint")}</TextInfo>}
        </View>
      )}
    </ScrollView>
  );
};
