import Button from "@/components/button";
import { PERSONALIZATION_GOALS } from "@/constants/personalization";
import type { PersonalizationGoal } from "@/constants/personalization";
import { t, tDynamic } from "@/lib/translation";
import { OptionRow } from "./option-row";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

const GOAL_EMOJI: Record<PersonalizationGoal, string> = {
  understand: "🔍",
  what_helps: "🌱",
  hard_time: "🫶",
  health: "🩺",
  remember: "📖",
};

/** Why the user is here. One answer. */
export const GoalSlide = ({
  navigation,
  name,
  goal,
  onChangeGoal,
  onNext,
}: {
  navigation: QuestionNavigation;
  name: string;
  goal: PersonalizationGoal | null;
  onChangeGoal: (goal: PersonalizationGoal) => void;
  onNext: () => void;
}) => (
  <QuestionLayout
    navigation={navigation}
    title={
      name
        ? t("onboarding_goal_title_named", { name })
        : t("onboarding_goal_title")
    }
    footer={
      <Button testID="onboarding-goal-next" onPress={onNext}>
        {goal ? t("onboarding_next") : t("onboarding_not_now")}
      </Button>
    }
  >
    {PERSONALIZATION_GOALS.map((option) => (
      <OptionRow
        key={option}
        testID={`onboarding-goal-${option}`}
        emoji={GOAL_EMOJI[option]}
        label={tDynamic(`onboarding_goal_${option}`)}
        isSelected={goal === option}
        onPress={() => onChangeGoal(option)}
      />
    ))}
  </QuestionLayout>
);
