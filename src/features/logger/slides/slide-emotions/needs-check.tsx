import { SegmentedControl } from "@expo/ui/community/segmented-control";
import chunk from "lodash/chunk";
import { View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { EmotionButtonBasic } from "./emotion-button-basic";
import { NEED_STATES, NEEDS, suggestEmotionsForNeed } from "./needs";
import type { NeedKey, NeedState, NeedStates } from "./needs";

const STATE_LABELS = {
  met: "log_needs_met",
  partly: "log_needs_partly",
  unmet: "log_needs_unmet",
} as const satisfies Record<NeedState, string>;

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
 * Needs mode of the emotions step. Each need shows its name, a one-line
 * meaning, and a native segmented control (met, partly, unmet). A rated
 * need shows matching feelings right below its control. Unrated needs show
 * no selected segment and no feelings.
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
  const haptics = useHaptics();
  const values = NEED_STATES.map((state) => t(STATE_LABELS[state]));

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 28 }}>
      {NEEDS.map((need) => {
        const state = states[need.key];
        const feelings = state
          ? suggestEmotionsForNeed(need, state, emotions)
          : [];

        return (
          <View key={need.key} style={{ gap: 12 }} testID={`needs-${need.key}`}>
            <View style={{ gap: 2 }}>
              <Label size={16} strong accessibilityRole="header">
                {t(need.label)}
              </Label>
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
            <SegmentedControl
              values={values}
              selectedIndex={state ? NEED_STATES.indexOf(state) : -1}
              tintColor={colors.tint}
              onChange={(event) => {
                const next =
                  NEED_STATES[event.nativeEvent.selectedSegmentIndex];
                if (next) {
                  haptics.selection();
                  onChange(need.key, next);
                }
              }}
              testID={`needs-${need.key}-control`}
            />
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
