import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlideMarginTop } from "./margin-top";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { RATING_KEYS } from "@/constants/ratings";
import { useLogDraft } from "../log-draft";
import { SlideHeadline } from "../components/slide-headline";
import { SlideMoodButton } from "../components/slide-mood-button";
import { SlideMoodFooter } from "../components/slide-mood-footer";

/**
 * Rating slide, always the first logger slide. Must render inside
 * `LogDraftProvider`. Picking a rating stores it in the draft;
 * `onRatingChanged` runs after a pick that changed the rating. The bottom
 * row holds the entry time and location, see `SlideMoodFooter`.
 */
export const SlideMood = ({
  onRatingChanged,
  isLocationVisible,
  isLocating,
  isActionVisible,
}: {
  onRatingChanged: () => void;
  isLocationVisible: boolean;
  isLocating: boolean;
  isActionVisible: boolean;
}) => {
  const colors = useColors();
  const { draft, setRating } = useLogDraft();
  const insets = useSafeAreaInsets();

  const marginTop = useSlideMarginTop();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        width: "100%",
        position: "relative",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View
        style={{
          flex: 1,
          marginTop,
        }}
      >
        <SlideHeadline
          style={{
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {t("log_rating_question")}
        </SlideHeadline>
        <View
          style={{
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 32,
            width: "100%",
            gap: 8,
            paddingBottom: 8,
          }}
        >
          {RATING_KEYS.map((key) => (
            <SlideMoodButton
              key={key}
              rating={key}
              selected={draft.rating === key}
              onPress={() => {
                const isChanged = draft.rating !== key;
                setRating(key);
                if (isChanged) {
                  onRatingChanged();
                }
              }}
            />
          ))}
        </View>
      </View>
      <SlideMoodFooter
        isLocationVisible={isLocationVisible}
        isLocating={isLocating}
        isActionVisible={isActionVisible}
      />
    </View>
  );
};
