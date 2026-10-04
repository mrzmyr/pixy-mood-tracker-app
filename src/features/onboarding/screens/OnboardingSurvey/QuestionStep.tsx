import dayjs from "dayjs";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import { PixyMascot } from "@/components/Pixy/PixyMascot";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { SurveyHeader } from "./SurveyHeader";
import { SurveyOptionCard, SurveyOptionChip } from "./SurveyOption";
import { reminderTimeToDate } from "@/features/notifications";
import {
  getReminderTime,
  getSectionProgress,
  SURVEY_QUESTIONS,
} from "./survey";
import type { SurveyQuestion } from "./survey";

/**
 * One survey question: progress, section, Pixy, question, answers.
 *
 * Single choice: `onPick`, the parent advances. Multi choice: `onToggle`,
 * then Continue. Every question can be skipped.
 */
export const QuestionStep = ({
  question,
  selected,
  reaction,
  celebrateKey,
  onPick,
  onToggle,
  onContinue,
  onSkip,
  onBack,
}: {
  question: SurveyQuestion;
  /** Selected values; one at most for single choice. */
  selected: string[];
  /** Pixy's reply shown under Pixy after a pick. */
  reaction: string | null;
  celebrateKey: number;
  onPick: (value: string) => void;
  onToggle: (value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) => {
  const colors = useColors();
  const index = SURVEY_QUESTIONS.indexOf(question);
  const isMulti = question.type === "multi";
  const label = (value: string) =>
    t(`onboarding_survey_${question.id}_${value}`);
  const hint = (value: string) => {
    if (question.hasHints) {
      return t(`onboarding_survey_${question.id}_${value}_hint`);
    }
    const time =
      question.id === "reminder" ? getReminderTime(value) : undefined;
    return time ? dayjs(reminderTimeToDate(time)).format("LT") : undefined;
  };
  const selectedValues = new Set(selected);

  return (
    <View style={{ flex: 1 }}>
      <SurveyHeader sections={getSectionProgress(index)} onBack={onBack} />
      <Text
        style={{
          marginTop: 18,
          textAlign: "center",
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.onboardingPaginationText,
        }}
      >
        {t(`onboarding_survey_section_${question.section}`)}
      </Text>
      <View style={{ alignItems: "center", marginTop: 22 }}>
        <PixyMascot size={88} celebrateKey={celebrateKey} />
      </View>
      <View style={{ height: 22, justifyContent: "center" }}>
        {reaction ? (
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={{
              textAlign: "center",
              fontSize: 14,
              fontWeight: "600",
              color: colors.onboardingSurveyAccent,
            }}
          >
            {reaction}
          </Animated.Text>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <Text
          accessibilityRole="header"
          style={{
            textAlign: "center",
            fontSize: 23,
            lineHeight: 28,
            fontWeight: "700",
            color: colors.onboardingTitle,
          }}
        >
          {t(`onboarding_survey_${question.id}_title`)}
        </Text>
        {question.hasSubtitle ? (
          <Text
            style={{
              textAlign: "center",
              fontSize: 15,
              marginTop: 4,
              color: colors.onboardingSurveyHint,
            }}
          >
            {t(`onboarding_survey_${question.id}_subtitle`)}
          </Text>
        ) : null}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
      >
        {question.layout === "chips" ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {question.options.map((option) => (
              <SurveyOptionChip
                key={option.value}
                emoji={option.emoji}
                label={label(option.value)}
                isSelected={selectedValues.has(option.value)}
                onPress={() => onToggle(option.value)}
                testID={`onboarding-survey-${question.id}-${option.value}`}
              />
            ))}
          </View>
        ) : (
          <View
            style={{ gap: 10 }}
            accessibilityRole={isMulti ? undefined : "radiogroup"}
          >
            {question.options.map((option) => (
              <SurveyOptionCard
                key={option.value}
                emoji={option.emoji}
                label={label(option.value)}
                hint={hint(option.value)}
                isSelected={selectedValues.has(option.value)}
                isMulti={isMulti}
                onPress={() =>
                  isMulti ? onToggle(option.value) : onPick(option.value)
                }
                testID={`onboarding-survey-${question.id}-${option.value}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
        {isMulti ? (
          <Button
            onPress={onContinue}
            disabled={selected.length === 0}
            testID="onboarding-survey-continue"
          >
            {t("onboarding_survey_continue")}
          </Button>
        ) : null}
        <LinkButton
          type="secondary"
          onPress={onSkip}
          testID="onboarding-survey-skip"
          style={{ paddingVertical: 14 }}
        >
          {t("onboarding_survey_skip")}
        </LinkButton>
      </View>
    </View>
  );
};
