import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import type { LoggerStep } from "@/constants/LoggerSteps";

import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import type { ReactElement } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import {
  Bell,
  CheckCircle,
  FileText,
  Heart,
  MessageSquare,
  Sun,
  Tag,
} from "react-native-feather";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";
import { useAnalytics } from "@/state/analytics";

/**
 * Settings > Steps: toggle optional logger steps and the confirmation after
 * a new entry. `rating` cannot be turned off.
 */
export const StepsScreen = () => {
  const colors = useColors();

  const ICONS_MAP: Record<LoggerStep, ReactElement> = {
    rating: <Sun width={20} height={20} stroke={colors.text} />,
    message: <FileText width={20} height={20} color={colors.text} />,
    tags: <Tag width={20} height={20} color={colors.text} />,
    emotions: <Heart width={20} height={20} color={colors.text} />,
    feedback: <MessageSquare width={20} height={20} color={colors.text} />,
    reminder: <Bell width={20} height={20} color={colors.text} />,
  };

  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
        <View
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
            }}
          >
            {t("steps_introduction")}
          </Text>
        </View>
        <MenuList style={{ marginTop: 16 }}>
          {STEP_OPTIONS.map((option) => (
            <MenuListItem
              key={option}
              title={
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      flexShrink: 1,
                      fontSize: 17,
                      color: colors.text,
                    }}
                  >
                    {t(`logger_step_${option}`)}
                  </Text>
                </View>
              }
              iconLeft={ICONS_MAP[option]}
              iconRight={
                option === "rating" ? undefined : (
                  <Switch
                    accessibilityLabel={t(`logger_step_${option}`)}
                    testID={`step-${option}-enabled`}
                    onValueChange={(enabled) => {
                      analytics.track("settings:step_toggled", {
                        step: option,
                        enabled,
                      });
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        steps: currentSettings.steps.includes(option)
                          ? currentSettings.steps.filter((s) => s !== option)
                          : [...currentSettings.steps, option],
                      }));
                    }}
                    value={settings.steps.includes(option)}
                  />
                )
              }
              isLast={option === STEP_OPTIONS.at(-1)}
            />
          ))}
        </MenuList>
        <MenuList style={{ marginTop: 32 }}>
          <MenuListItem
            title={t("steps_confirmation")}
            iconLeft={
              <CheckCircle width={20} height={20} color={colors.text} />
            }
            iconRight={
              <Switch
                accessibilityLabel={t("steps_confirmation")}
                testID="step-confirmation-enabled"
                onValueChange={(enabled) => {
                  analytics.track("settings:confirmation_toggled", {
                    enabled,
                  });
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    confirmationEnabled: enabled,
                  }));
                }}
                value={settings.confirmationEnabled}
              />
            }
            isLast
          />
        </MenuList>
        <TextInfo>{t("steps_confirmation_info")}</TextInfo>
      </ScrollView>
    </View>
  );
};
