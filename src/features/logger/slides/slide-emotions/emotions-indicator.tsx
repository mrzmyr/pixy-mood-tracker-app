import { useSetting } from "@/state/settings";
import useScale from "@/hooks/use-scale";
import type { Emotion } from "@/types";
import chroma from "chroma-js";
import { useColorScheme, View } from "react-native";

import { EMOTION_ICONS } from "../../emotion-icons";
import { EmotionIcon } from "./emotion-icon";
import { COMPACT_CHIP } from "@/constants/chip";

/**
 * Category marker for an emotion. Uses only the scale's `very_good`,
 * `neutral`, and `very_bad` colors, so `good` and `bad` match the extremes.
 *
 * Two-tone icon tinted with the category color. Nothing for a key without
 * an icon, for example from a newer app version.
 */
export const EmotionIndicator = ({
  emotion,
  compact = false,
  size,
  surface,
}: {
  emotion: Pick<Emotion, "key" | "category">;
  /** Smaller icon or dot for compact chips. */
  compact?: boolean;
  /** Icon size on its own, without the gap to a label. */
  size?: number;
  /**
   * Surface under the icon. Defaults to the color scheme. A selected chip
   * is inverted, so its icon draws for the opposite surface.
   */
  surface?: "light" | "dark";
}) => {
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);
  const colorScheme = useColorScheme();
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  };

  const color = colorMapping[emotion.category];
  const gap = compact ? COMPACT_CHIP.gap : 8;
  const icon = EMOTION_ICONS[emotion.key];
  const isLightSurface = (surface ?? colorScheme) === "light";
  const isInverted = surface !== undefined && surface !== colorScheme;

  if (!icon) {
    return null;
  }

  return (
    <View
      // The selected-surface copy in a chip has no ID, so the ID stays unique.
      testID={surface === undefined ? `emotion-icon-${emotion.key}` : undefined}
      style={{ marginRight: size === undefined ? gap : 0 }}
    >
      <EmotionIcon
        emotionKey={emotion.key}
        size={size ?? (compact ? 16 : 20)}
        tint={color.background}
        tintOpacity={isInverted ? 0.45 : undefined}
        stroke={
          // Light category colors are too pale for a thin outline on white.
          isLightSurface
            ? // oxlint-disable-next-line pixy-standards/no-color-shading -- emotion category colors have no border token yet
              chroma(color.background).darken(1.5).hex()
            : color.background
        }
      />
    </View>
  );
};
