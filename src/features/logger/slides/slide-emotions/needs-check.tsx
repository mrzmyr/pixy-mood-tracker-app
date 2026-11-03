import chunk from "lodash/chunk";
import { View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { EmotionButtonBasic } from "./emotion-button-basic";
import { NeedRating } from "./need-rating";
import { NEEDS, suggestEmotionsForNeed } from "./needs";
import type { NeedKey, NeedState, NeedStates } from "./needs";

const CELL_GAP = 8;
const CELL_STYLE = { flex: 1 };
const REVEAL_MS = 220;

/**
 * Two-column feelings under one rated need, in the look of the basic grid.
 * Fades in when the need gets its first rating.
 */
const NeedFeelings = ({
  emotions,
  selectedEmotions,
  onPress,
  testID,
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  testID: string;
}) => {
  const isSelected = (emotion: Emotion) =>
    selectedEmotions.some((d) => d.key === emotion.key);

  return (
    <Animated.View
      // Built at render: router suites mock reanimated without FadeIn.
      entering={FadeIn.duration(REVEAL_MS).easing(Easing.out(Easing.quad))}
      style={{ gap: CELL_GAP }}
      testID={testID}
    >
      {chunk(emotions, 2).map((row) => (
        <View
          key={`row-${row[0].key}`}
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
      ))}
    </Animated.View>
  );
};

/**
 * Needs mode of the emotions step. Each need shows its name with a compact
 * native rating (unmet, partly, met) at the end of the row, and a one-line
 * meaning below. A rated need shows matching feelings right below. Unrated
 * needs show no selected segment and no feelings.
 */
export const NeedsCheck = ({
  states,
  onChange,
  emotions,
  selectedEmotions,
  onPressEmotion,
}: {
  states: NeedStates;
  onChange: (key: NeedKey, state: NeedState) => void;
  /** All emotions. Feelings come from this list. */
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPressEmotion: (emotion: Emotion) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        // Last control clears the 32 pt bottom fade of the list.
        paddingBottom: 40,
        gap: 28,
      }}
    >
      {NEEDS.map((need) => {
        const state = states[need.key];
        const feelings = state
          ? suggestEmotionsForNeed(need, state, emotions)
          : [];

        return (
          <View key={need.key} style={{ gap: 12 }} testID={`needs-${need.key}`}>
            <View style={{ gap: 2 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Label
                  size={16}
                  strong
                  accessibilityRole="header"
                  style={{ flexShrink: 1 }}
                >
                  {t(need.label)}
                </Label>
                <NeedRating
                  label={t(need.label)}
                  state={state}
                  onChange={(next) => onChange(need.key, next)}
                  testID={`needs-${need.key}-control`}
                />
              </View>
              <Label
                size={14}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{ color: colors.textSecondary }}
              >
                {t(need.description)}
              </Label>
            </View>
            {feelings.length > 0 && (
              <NeedFeelings
                emotions={feelings}
                selectedEmotions={selectedEmotions}
                onPress={onPressEmotion}
                testID={`needs-${need.key}-feelings`}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};
