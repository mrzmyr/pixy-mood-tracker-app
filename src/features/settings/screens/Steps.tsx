import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import type {
  ConfigurableLoggerStep,
  LoggerStep,
} from "@/constants/LoggerSteps";

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
import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useFeatureFlag } from "@/state/featureFlags";
import { useStepEnabled } from "../useStepEnabled";

/** Steps with their own settings page; the list links there instead of a switch. */
const STEP_PAGES = {
  tags: "/settings/steps/tags",
  people: "/settings/steps/people",
} as const;

const hasStepPage = (
  step: ConfigurableLoggerStep
): step is keyof typeof STEP_PAGES => step in STEP_PAGES;

/** One step in the Check-in list: a switch, or a link with On/Off for steps with a page. */
const StepRow = ({
  step,
  icon,
  isLast,
}: {
  step: ConfigurableLoggerStep;
  icon: ReactElement;
  isLast: boolean;
}) => {
  const colors = useColors();
  const router = useRouter();
  const { enabled, setEnabled } = useStepEnabled(step);
  const page = hasStepPage(step) ? STEP_PAGES[step] : null;

  let iconRight: ReactElement | undefined;
  if (page === null && step !== "rating") {
    iconRight = (
      <Switch
        accessibilityLabel={t(`logger_step_${step}`)}
        testID={`step-${step}-enabled`}
        onValueChange={setEnabled}
        value={enabled}
      />
    );
  }

  return (
    <MenuListItem
      title={
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>
            {t(`logger_step_${step}`)}
          </Text>
          {page !== null && (
            <Text
              style={{
                fontSize: 17,
                color: colors.textSecondary,
                marginRight: 8,
              }}
            >
              {enabled ? t("step_status_on") : t("step_status_off")}
            </Text>
          )}
        </View>
      }
      iconLeft={icon}
      iconRight={iconRight}
      isLink={page !== null}
      onPress={page === null ? null : () => router.push(page)}
      testID={page === null ? undefined : `step-${step}`}
      isLast={isLast}
    />
  );
};

/**
 * Settings > Check-in: the logger steps in order. `rating` cannot be turned
 * off. Tags and People open their own page with the switch and their list.
 * `people` shows only behind the `people` feature flag.
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
            <StepRow
              key={option}
              step={option}
              icon={ICONS_MAP[option]}
              isLast={option === options.at(-1)}
            />
          ))}
        </MenuList>
      </ScrollView>
    </View>
  );
};
