import Button from "@/components/button";
import { PERSONALIZATION_STRUGGLES } from "@/constants/personalization";
import type { PersonalizationStruggle } from "@/constants/personalization";
import { t, tDynamic } from "@/lib/translation";
import { OptionRow } from "./option-row";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

const STRUGGLE_EMOJI: Record<PersonalizationStruggle, string> = {
  stress: "🌪️",
  anxiety: "😰",
  low_mood: "🌧️",
  sleep: "🌙",
  focus: "🎯",
  loneliness: "🫥",
  relationships: "💞",
  work: "💼",
  grief: "🕊️",
  body: "🩹",
  medication: "💊",
};

/**
 * What the user deals with lately. Any number of answers, none is fine.
 * The answers pick suggested tags and stay on this device.
 */
export const StrugglesSlide = ({
  navigation,
  struggles,
  onToggleStruggle,
  onNext,
}: {
  navigation: QuestionNavigation;
  struggles: PersonalizationStruggle[];
  onToggleStruggle: (struggle: PersonalizationStruggle) => void;
  onNext: () => void;
}) => (
  <QuestionLayout
    navigation={navigation}
    title={t("onboarding_struggles_title")}
    subtitle={t("onboarding_struggles_body")}
    footer={
      <Button testID="onboarding-struggles-next" onPress={onNext}>
        {struggles.length > 0 ? t("onboarding_next") : t("onboarding_not_now")}
      </Button>
    }
  >
    {PERSONALIZATION_STRUGGLES.map((option) => (
      <OptionRow
        key={option}
        multiple
        testID={`onboarding-struggle-${option}`}
        emoji={STRUGGLE_EMOJI[option]}
        label={tDynamic(`onboarding_struggle_${option}`)}
        isSelected={struggles.includes(option)}
        onPress={() => onToggleStruggle(option)}
      />
    ))}
  </QuestionLayout>
);
