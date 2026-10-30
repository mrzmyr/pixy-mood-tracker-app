import chunk from "lodash/chunk";
import { View } from "react-native";
import { Headline, Secondary } from "@/components/type";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { EmotionButtonBasic } from "./emotion-button-basic";

const CELL_STYLE = { flex: 1 };
const CELL_GAP = 8;

/**
 * Emotions suggested by the needs check, in the two-column look of the basic
 * grid. Shows a hint while no need is rated.
 */
export const SuggestedEmotions = ({
  emotions,
  selectedEmotions,
  onPress,
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
}) => {
  const isSelected = (emotion: Emotion) =>
    selectedEmotions.some((d) => d.key === emotion.key);

  return (
    <View
      style={{ paddingHorizontal: 20, paddingTop: 24, gap: CELL_GAP }}
      testID="needs-suggested"
    >
      <Headline accessibilityRole="header">{t("log_needs_suggested")}</Headline>
      {emotions.length === 0 ? (
        <Secondary>{t("log_needs_hint")}</Secondary>
      ) : (
        chunk(emotions, 2).map((row) => (
          <View
            key={`suggested-row-${row[0].key}`}
            style={{ flexDirection: "row", gap: CELL_GAP }}
          >
            {row.map((emotion) => (
              <View key={emotion.key} style={CELL_STYLE}>
                <EmotionButtonBasic
                  emotion={emotion}
                  onPress={onPress}
                  selected={isSelected(emotion)}
                />
              </View>
            ))}
            {row.length === 1 && <View style={CELL_STYLE} />}
          </View>
        ))
      )}
    </View>
  );
};
