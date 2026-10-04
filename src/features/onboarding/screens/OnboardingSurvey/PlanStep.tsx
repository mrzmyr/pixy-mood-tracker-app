import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import dayjs from "dayjs";
import Button from "@/components/Button";
import { PixyMascot } from "@/components/Pixy/PixyMascot";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { reminderTimeToDate } from "@/features/notifications";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { createRise } from "./motion";
import type { SurveyPlan } from "./plan";
import { getInfluenceTagTitle } from "./useApplyPlan";

const STEP_LABELS: Record<ConfigurableLoggerStep, string> = {
  rating: "logger_step_rating",
  emotions: "logger_step_emotions",
  tags: "logger_step_tags",
  message: "onboarding_survey_plan_step_note",
  feedback: "logger_step_feedback",
};

interface Card {
  key: string;
  emoji: string;
  title: string;
  body: string;
  chips?: string[];
  variant: "setup" | "tip" | "privacy";
}

const CARD_BACKGROUND = {
  setup: "onboardingSurveyOptionBackground",
  tip: "onboardingSurveyAccentSoft",
  privacy: null,
} as const;

const getPrivacyCard = (): Card => ({
  key: "privacy",
  emoji: "🔒",
  title: t("onboarding_survey_plan_privacy_title"),
  body: t("onboarding_survey_plan_privacy_body"),
  variant: "privacy",
});

const PlanCard = ({ card, delay }: { card: Card; delay: number }) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const background = CARD_BACKGROUND[card.variant];
  const rise = useMemo(
    () => createRise({ delay, isReducedMotion }),
    [delay, isReducedMotion]
  );

  return (
    <Animated.View
      entering={rise}
      testID={`onboarding-survey-plan-${card.key}`}
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 14,
        marginBottom: 8,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: card.variant === "privacy" ? "dashed" : "solid",
        borderColor:
          card.variant === "tip"
            ? "transparent"
            : colors.onboardingSurveyOptionBorder,
        backgroundColor: background ? colors[background] : "transparent",
      }}
    >
      <Text style={{ fontSize: 22, width: 28, textAlign: "center" }}>
        {card.emoji}
      </Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.onboardingSurveyOptionText,
          }}
        >
          {card.title}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: 13,
            lineHeight: 18,
            color: colors.onboardingSurveyHint,
          }}
        >
          {card.body}
        </Text>
        {card.chips ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 5,
              marginTop: 7,
            }}
          >
            {card.chips.map((chip) => (
              <Text
                key={chip}
                style={{
                  overflow: "hidden",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.onboardingSurveyOptionText,
                  backgroundColor: colors.onboardingSurveyAccentSoft,
                }}
              >
                {chip}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const getSetupCards = (plan: SurveyPlan, canNotify: boolean): Card[] => {
  const cards: Card[] = [];

  if (plan.reminderTime && canNotify) {
    cards.push({
      key: "reminder",
      emoji: "🔔",
      title: t("onboarding_survey_plan_reminder_title", {
        time: dayjs(reminderTimeToDate(plan.reminderTime)).format("LT"),
      }),
      body: t("onboarding_survey_plan_reminder_body"),
      variant: "setup",
    });
  } else if (plan.reminderTime) {
    cards.push({
      key: "reminder",
      emoji: "🔕",
      title: t("onboarding_survey_plan_reminder_blocked_title"),
      body: t("onboarding_survey_plan_reminder_blocked_body"),
      variant: "setup",
    });
  } else {
    cards.push({
      key: "reminder",
      emoji: "🔕",
      title: t("onboarding_survey_plan_no_reminder_title"),
      body: t("onboarding_survey_plan_no_reminder_body"),
      variant: "setup",
    });
  }

  if (plan.steps) {
    cards.push({
      key: "steps",
      emoji: "🧩",
      title: t("onboarding_survey_plan_steps_title", {
        steps: plan.steps.map((step) => t(STEP_LABELS[step])).join(" · "),
      }),
      body: t("onboarding_survey_plan_steps_body"),
      variant: "setup",
    });
  }

  if (plan.tags.length > 0) {
    cards.push({
      key: "tags",
      emoji: "🏷️",
      title: t("onboarding_survey_plan_tags_title", {
        count: plan.tags.length,
      }),
      body: t("onboarding_survey_plan_tags_body"),
      chips: plan.tags.map(getInfluenceTagTitle),
      variant: "setup",
    });
  }

  return cards;
};

const TIP_EMOJI: Record<SurveyPlan["tips"][number], string> = {
  import: "📥",
  emotions: "🫶",
  monthly_report: "📊",
  export: "📤",
  multiple_entries: "🔂",
  filters: "🔎",
  year_in_pixels: "🟧",
  notes: "✍️",
  pixel_calendar: "🟧",
};

/**
 * Plan screen: what Pixy set up, each with its reason, and up to three
 * feature tips. "Log Your First Mood" finishes onboarding.
 */
export const PlanStep = ({
  plan,
  canNotify,
  onFinish,
}: {
  plan: SurveyPlan;
  canNotify: boolean;
  onFinish: () => void;
}) => {
  const colors = useColors();
  const [celebrateKey, setCelebrateKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCelebrateKey(1), 300);
    return () => clearTimeout(timer);
  }, []);

  const setup = getSetupCards(plan, canNotify);
  const tips: Card[] = plan.tips.map((tip) => ({
    key: tip,
    emoji: TIP_EMOJI[tip],
    title: t(`onboarding_survey_tip_${tip}_title`),
    body: t(`onboarding_survey_tip_${tip}_body`),
    variant: "tip",
  }));
  const privacy = getPrivacyCard();
  const sectionTitle = {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 4,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onboardingPaginationText,
  } as const;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
      >
        <View style={{ alignItems: "center", paddingTop: 6 }}>
          <PixyMascot size={84} celebrateKey={celebrateKey} />
          <View
            style={{
              marginTop: 8,
              maxWidth: 290,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 18,
              backgroundColor: colors.onboardingSurveyBubble,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 17,
                fontWeight: "700",
                textAlign: "center",
                color: colors.onboardingTitle,
              }}
            >
              {t("onboarding_survey_plan_title")}
            </Text>
            {plan.isCaring ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 14,
                  textAlign: "center",
                  color: colors.onboardingBody,
                }}
              >
                {t("onboarding_survey_plan_caring")}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={sectionTitle}>{t("onboarding_survey_plan_setup")}</Text>
        {setup.map((card, index) => (
          <PlanCard key={card.key} card={card} delay={150 + index * 80} />
        ))}
        <Text style={sectionTitle}>{t("onboarding_survey_plan_tips")}</Text>
        {[...tips, privacy].map((card, index) => (
          <PlanCard
            key={card.key}
            card={card}
            delay={150 + (setup.length + index) * 80}
          />
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16 }}>
        <Button onPress={onFinish} testID="onboarding-survey-finish">
          {t("onboarding_survey_plan_button")}
        </Button>
      </View>
    </View>
  );
};
