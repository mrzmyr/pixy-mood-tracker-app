import { View } from "react-native";
import { RATING_KEYS } from "@/constants/ratings";
import {
  SlideHeadline,
  SlideMoodButton,
  useSlideMarginTop,
} from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import { INSET } from "./quick-check-in-section";

/**
 * First quick check-in slide: the mood buttons of the logger rating slide.
 * Every tap, also on the selected mood, moves on to the second slide.
 */
export const QuickCheckInMoodSlide = ({
  rating,
  onRate,
}: {
  rating: LogItem["rating"] | null;
  onRate: (rating: LogItem["rating"]) => void;
}) => {
  const marginTop = useSlideMarginTop();

  return (
    <View style={{ flex: 1, paddingHorizontal: INSET, marginTop }}>
      <SlideHeadline style={{ justifyContent: "center", alignItems: "center" }}>
        {t("log_rating_question")}
      </SlideHeadline>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("logger_step_rating")}
        style={{ alignItems: "center", marginTop: 32, gap: 8 }}
      >
        {RATING_KEYS.map((key) => (
          <SlideMoodButton
            key={key}
            rating={key}
            selected={rating === key}
            onPress={() => onRate(key)}
          />
        ))}
      </View>
    </View>
  );
};
