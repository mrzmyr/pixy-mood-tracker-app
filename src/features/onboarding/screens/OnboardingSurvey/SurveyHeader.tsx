import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

const Segment = ({ progress }: { progress: number }) => {
  const colors = useColors();
  const fill = useSharedValue(progress);

  useEffect(() => {
    fill.set(
      withTiming(progress, {
        duration: 500,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      })
    );
  }, [progress, fill]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.get() }],
  }));

  return (
    <View
      style={{
        flex: 1,
        height: 10,
        borderRadius: 5,
        overflow: "hidden",
        backgroundColor: colors.onboardingSurveyTrack,
      }}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            borderRadius: 5,
            transformOrigin: "left",
            backgroundColor: colors.onboardingSurveyAccent,
          },
          style,
        ]}
      />
    </View>
  );
};

/**
 * Back button and one progress segment per survey section.
 */
export const SurveyHeader = ({
  sections,
  onBack,
}: {
  /** Progress 0 to 1 per section. */
  sections: { key: string; progress: number }[];
  onBack: () => void;
}) => {
  const colors = useColors();
  const done = sections.reduce((sum, section) => sum + section.progress, 0);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 18,
        paddingTop: 4,
      }}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("onboarding_survey_back")}
        hitSlop={8}
        testID="onboarding-survey-back"
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.onboardingSurveyBackButton,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 24,
            lineHeight: 26,
            marginTop: -2,
            color: colors.onboardingBody,
          }}
        >
          ‹
        </Text>
      </Pressable>
      <View
        style={{ flex: 1, flexDirection: "row", gap: 6, marginRight: 54 }}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: sections.length,
          now: done,
        }}
      >
        {sections.map((section) => (
          <Segment key={section.key} progress={section.progress} />
        ))}
      </View>
    </View>
  );
};
