import Button from "@/components/button";
import { t, tDynamic } from "@/lib/translation";
import type { CaptureOption } from "../../personalization";
import { OptionRow } from "./option-row";
import { QuestionLayout } from "./question-layout";
import type { QuestionNavigation } from "./question-layout";

const CAPTURE_EMOJI: Record<CaptureOption, string> = {
  emotions: "💜",
  sleep: "🛌",
  photos: "📸",
  people: "👥",
  message: "📝",
};

/**
 * Which check-in steps the user wants. `options` lists the steps this
 * install can show; places shows when location is available.
 */
export const CaptureSlide = ({
  navigation,
  options,
  chosen,
  onToggle,
  hasPlaces,
  isPlacesChosen,
  onTogglePlaces,
  onNext,
}: {
  navigation: QuestionNavigation;
  options: readonly CaptureOption[];
  chosen: ReadonlySet<CaptureOption>;
  onToggle: (option: CaptureOption) => void;
  hasPlaces: boolean;
  isPlacesChosen: boolean;
  onTogglePlaces: () => void;
  onNext: () => void;
}) => (
  <QuestionLayout
    navigation={navigation}
    title={t("onboarding_capture_title")}
    subtitle={t("onboarding_capture_body")}
    footer={
      <Button testID="onboarding-capture-next" onPress={onNext}>
        {t("onboarding_next")}
      </Button>
    }
  >
    {options.map((option) => (
      <OptionRow
        key={option}
        multiple
        testID={`onboarding-capture-${option}`}
        emoji={CAPTURE_EMOJI[option]}
        label={tDynamic(`onboarding_capture_${option}`)}
        description={tDynamic(`onboarding_capture_${option}_body`)}
        isSelected={chosen.has(option)}
        onPress={() => onToggle(option)}
      />
    ))}
    {hasPlaces ? (
      <OptionRow
        multiple
        testID="onboarding-capture-places"
        emoji="📍"
        label={t("onboarding_capture_places")}
        description={t("onboarding_capture_places_body")}
        isSelected={isPlacesChosen}
        onPress={onTogglePlaces}
      />
    ) : null}
  </QuestionLayout>
);
