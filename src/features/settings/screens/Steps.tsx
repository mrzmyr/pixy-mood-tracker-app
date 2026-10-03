import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import type { LoggerStep } from "@/constants/LoggerSteps";

import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/lib/translation";
import type { ReactElement } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import {
  Bell,
  FileText,
  Heart,
  MessageSquare,
  Sun,
  Tag,
  Users,
} from "react-native-feather";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";

/**
 * Settings > Steps: toggle optional logger steps. `rating` cannot be
 * turned off. `people` shows only behind the `people` feature flag.
 */
export const StepsScreen = () => {
  const colors = useColors();
  const hasPeople = useFeatureFlag("people");
  const options = STEP_OPTIONS.filter(
    (option) => option !== "people" || hasPeople
  );

  const ICONS_MAP: Record<LoggerStep, ReactElement> = {
    rating: <Sun width={20} height={20} stroke={colors.text} />,
    message: <FileText width={20} height={20} color={colors.text} />,
    tags: <Tag width={20} height={20} color={colors.text} />,
    people: <Users width={20} height={20} color={colors.text} />,
    emotions: <Heart width={20} height={20} color={colors.text} />,
    feedback: <MessageSquare width={20} height={20} color={colors.text} />,
    reminder: <Bell width={20} height={20} color={colors.text} />,
  };

  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const enabledSteps = new Set(settings.steps);

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
          {options.map((option) => (
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
                        steps: new Set(currentSettings.steps).has(option)
                          ? currentSettings.steps.filter((s) => s !== option)
                          : [...currentSettings.steps, option],
                      }));
                    }}
                    value={enabledSteps.has(option)}
                  />
                )
              }
              isLast={option === options.at(-1)}
            />
          ))}
        </MenuList>
      </ScrollView>
    </View>
  );
};
