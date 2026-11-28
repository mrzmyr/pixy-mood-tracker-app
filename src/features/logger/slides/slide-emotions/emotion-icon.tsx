import { DuotoneIcon, TINT_OPACITY } from "@/components/duotone-icon";
import useColors from "@/hooks/use-colors";
import type { Emotion } from "@/types";

import { EMOTION_ICONS } from "../../emotion-icons";

/**
 * Two-tone icon for an emotion: a tint layer at low opacity under an outline.
 * Neutral theme colors by default. Pass `stroke` and `tint` to color it.
 *
 * Outline and tint body (silhouette) come from the Pixy icon set. Nothing for
 * a key without an icon, for example from a newer app version.
 */
export const EmotionIcon = ({
  emotionKey,
  stroke,
  tint,
  size = 20,
  tintOpacity = TINT_OPACITY,
}: {
  emotionKey: Emotion["key"];
  /** Outline color. Default: theme text color. */
  stroke?: string;
  /** Tint layer color, drawn at low opacity. Default: theme secondary text color. */
  tint?: string;
  size?: number;
  /** Tint opacity; higher on dark surfaces, like a selected chip. */
  tintOpacity?: number;
}) => {
  const colors = useColors();
  const icon = EMOTION_ICONS[emotionKey];
  if (!icon) {
    return null;
  }

  return (
    <DuotoneIcon
      icon={icon.outline}
      tintLayer={{ fill: [], underlay: icon.silhouette }}
      stroke={stroke ?? colors.text}
      tint={tint ?? colors.textSecondary}
      size={size}
      tintOpacity={tintOpacity}
    />
  );
};
