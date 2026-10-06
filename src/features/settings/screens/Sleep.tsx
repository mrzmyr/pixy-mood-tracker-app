import { ScrollView, Switch, View } from "react-native";
import FlagHighlight from "@/components/FlagHighlight";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { useHealthSleepSetting } from "@/features/health";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { StepSwitch } from "../components/StepSwitch";
import { useStepEnabled } from "../useStepEnabled";

/**
 * Settings > Check-in > Sleep: the step switch, and while the step is on,
 * the switch that fills the sleep quality from Apple Health. Opens only
 * while the `apple-health` flag is on and the device has Apple Health.
 */
export const SettingsSleepScreen = () => {
  const colors = useColors();
  const { enabled } = useStepEnabled("sleep");
  const { isEnabled, setEnabled } = useHealthSleepSetting();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <StepSwitch step="sleep" />
      {enabled && (
        <View style={{ marginHorizontal: 16 }}>
          <MenuListHeadline style={{ marginTop: 16 }}>
            {t("health_section")}
          </MenuListHeadline>
          <FlagHighlight flag="apple-health">
            <MenuList>
              <MenuListItem
                title={t("health_sleep_setting")}
                iconRight={
                  <Switch
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
