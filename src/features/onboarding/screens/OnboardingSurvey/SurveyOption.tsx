import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import useColors from "@/hooks/useColors";

// Selected options pop once: quick grow, spring back.
const usePop = (isSelected: boolean) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isSelected) {
      scale.set(
        withSequence(
          withTiming(1.03, { duration: 90 }),
          withSpring(1, { damping: 12, stiffness: 260 })
        )
      );
    }
  }, [isSelected, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
};

/**
 * Full-width answer card: emoji, label, optional hint. Multi choice shows a
 * `+` that turns into a check.
 */
export const SurveyOptionCard = ({
  emoji,
  label,
  hint,
  isSelected,
  isMulti,
  onPress,
  testID,
}: {
  emoji: string;
  label: string;
  hint?: string;
  isSelected: boolean;
  isMulti: boolean;
  onPress: () => void;
  testID?: string;
}) => {
  const colors = useColors();
  const pop = usePop(isSelected);

  return (
    <Animated.View style={pop}>
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole={isMulti ? "checkbox" : "radio"}
        accessibilityLabel={hint ? `${label}, ${hint}` : label}
        accessibilityState={
          isMulti ? { checked: isSelected } : { selected: isSelected }
        }
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          minHeight: 62,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: isSelected
            ? colors.onboardingSurveyAccent
            : colors.onboardingSurveyOptionBorder,
          backgroundColor: isSelected
            ? colors.onboardingSurveyAccentSoft
            : colors.onboardingSurveyOptionBackground,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Text style={{ fontSize: 26, width: 34, textAlign: "center" }}>
          {emoji}
        </Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.onboardingSurveyOptionText,
            }}
          >
            {label}
          </Text>
          {hint ? (
            <Text
              style={{
                fontSize: 13,
                marginTop: 1,
                color: colors.onboardingSurveyHint,
              }}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        {isMulti ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isSelected
                ? colors.onboardingSurveyAccent
                : colors.onboardingSurveyTrack,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: isSelected ? "#fff" : colors.onboardingSurveyHint,
              }}
            >
              {isSelected ? "✓" : "+"}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

/** Compact multi-choice chip: emoji and label. */
export const SurveyOptionChip = ({
  emoji,
  label,
  isSelected,
  onPress,
  testID,
}: {
  emoji: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}) => {
  const colors = useColors();
  const pop = usePop(isSelected);

  return (
    <Animated.View style={pop}>
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: isSelected }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          minHeight: 44,
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: isSelected
            ? colors.onboardingSurveyAccent
            : colors.onboardingSurveyOptionBorder,
          backgroundColor: isSelected
            ? colors.onboardingSurveyAccentSoft
            : colors.onboardingSurveyOptionBackground,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Text style={{ fontSize: 17 }}>{emoji}</Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.onboardingSurveyOptionText,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
