import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSlideMarginTop } from "./marginTop";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { RATING_KEYS } from "@/constants/Ratings";
import { useLogDraft } from "../logDraft";
import { SlideHeadline } from "../components/SlideHeadline";
import { SlideMoodButton } from "../components/SlideMoodButton";

/**
 * Rating slide, always the first logger slide. Must render inside
 * `LogDraftProvider`. Picking a rating stores it in the draft;
 * `onRatingChanged` runs after a pick that changed the rating.
 */
export const SlideMood = ({
  onRatingChanged,
}: {
  onRatingChanged: () => void;
}) => {
  const colors = useColors();
  const { draft, setRating, setDateTime } = useLogDraft();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const marginTop = getSlideMarginTop();
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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
        {Platform.OS !== "web" && (
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            date={draft.dateTime ? new Date(draft.dateTime) : new Date()}
            mode="datetime"
            onConfirm={(date) => {
              setIsDatePickerVisible(false);
              setDateTime(date.toISOString());
              router.setParams({ dateTime: date.toISOString() });
            }}
            onCancel={() => setIsDatePickerVisible(false)}
          />
        )}
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
    </View>
  );
};
