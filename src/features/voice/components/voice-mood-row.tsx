import { View } from "react-native";
import { Caption, Secondary } from "@/components/type";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useScale from "@/hooks/use-scale";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { MoodTrigger } from "../mood-triggers";

/**
 * Trigger words for the 7 moods, best to worst, in the user's scale colors.
 * The spoken mood (`rating`) shows filled.
 */
export const VoiceMoodRow = ({
  triggers,
  rating,
}: {
  triggers: MoodTrigger[];
  rating: MoodTrigger["rating"] | null;
}) => {
  const colors = useColors();
  const scale = useScale(useSetting("scaleType"));

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Secondary>{t("voice_mood_hint")}</Secondary>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {triggers.map((trigger) => {
          const isSelected = trigger.rating === rating;
          const moodColors = scale.colors[trigger.rating];
          return (
            <View
              key={trigger.rating}
              accessible
              accessibilityLabel={trigger.text}
              accessibilityState={{ selected: isSelected }}
              testID={`voice-mood-${trigger.rating}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: RADIUS.full,
                borderWidth: 1,
                borderColor: isSelected
                  ? moodColors.background
                  : colors.cardBorder,
                backgroundColor: isSelected
                  ? moodColors.background
                  : colors.cardBackground,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: RADIUS.full,
                  backgroundColor: isSelected
                    ? moodColors.text
                    : moodColors.background,
                }}
              />
              <Caption
                style={isSelected ? { color: moodColors.text } : undefined}
              >
                {trigger.text}
              </Caption>
            </View>
          );
        })}
      </View>
    </View>
  );
};
