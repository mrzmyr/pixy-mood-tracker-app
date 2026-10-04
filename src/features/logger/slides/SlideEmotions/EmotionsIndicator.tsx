import { useSetting } from "@/state/settings";
import { useFeatureFlag } from "@/state/featureFlags";
import useScale from "@/hooks/useScale";
import type { Emotion } from "@/types";
import chroma from "chroma-js";
import { useColorScheme, View } from "react-native";

import { EMOTION_ICONS } from "../../emotionIcons";
import { EmotionIcon } from "./EmotionIcon";

/**
 * Category marker for an emotion. Uses only the scale's `very_good`,
 * `neutral`, and `very_bad` colors, so `good` and `bad` match the extremes.
 *
 * Flag `emotion-icons` on: two-tone icon tinted with the category color.
 * Off, or no icon for the emotion: 8pt category dot.
 */
export const EmotionIndicator = ({
  emotion,
}: {
  emotion: Pick<Emotion, "key" | "category">;
}) => {
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);
  const colorScheme = useColorScheme();
  const isIconsEnabled = useFeatureFlag("emotion-icons");
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  };

  const color = colorMapping[emotion.category];
  const icon = EMOTION_ICONS[emotion.key];

  if (isIconsEnabled && icon) {
    return (
      <View testID={`emotion-icon-${emotion.key}`} style={{ marginRight: 8 }}>
        <EmotionIcon
          icon={icon}
          tint={color.background}
          stroke={
            // Light category colors are too pale for a thin outline on white.
            colorScheme === "light"
              ? chroma(color.background).darken(1.5).hex()
              : color.background
          }
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 8,
        height: 8,
        backgroundColor: color.background,
        borderRadius: 100,
        marginRight: 10,
        paddingRight: 8,
      }}
    />
  );
};
