import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import useColors from "@/hooks/use-colors";
import type { Emotion } from "@/types";

import { EMOTION_ICONS } from "../../emotion-icons";
import { EMOTION_TINTS } from "../../emotion-tints";

/**
 * SVG element for a Hugeicons shape type: every type the free set uses.
 * Unknown types return `null` and the shape is skipped.
 */
const elementFor = (type: string) => {
  if (type === "path") {
    return Path;
  }
  if (type === "circle") {
    return Circle;
  }
  if (type === "ellipse") {
    return Ellipse;
  }
  if (type === "rect") {
    return Rect;
  }
  return null;
};

/** Opacity of the tint under the outline. */
const TINT_OPACITY = 0.35;

/**
 * Two-tone icon for an emotion: a tint layer at low opacity under an outline.
 * Neutral theme colors by default. Pass `stroke` and `tint` to color it.
 *
 * Outline from Hugeicons free Stroke Rounded (MIT). Hugeicons free has no
 * two-tone style, so the tint layer is Pixy's own (`EMOTION_TINTS`).
 * Nothing for a key without an icon, for example from a newer app version.
 */
export const EmotionIcon = ({
  emotionKey,
  stroke,
  tint,
  size = 20,
}: {
  emotionKey: Emotion["key"];
  /** Outline color. Default: theme text color. */
  stroke?: string;
  /** Tint layer color, drawn at low opacity. Default: theme secondary text color. */
  tint?: string;
  size?: number;
}) => {
  const colors = useColors();
  const icon = EMOTION_ICONS[emotionKey];
  if (!icon) {
    return null;
  }

  const tintLayer = EMOTION_TINTS[emotionKey];
  const filled = tintLayer?.fill ? new Set(tintLayer.fill) : null;
  const outlineColor = stroke ?? colors.text;
  const tintColor = tint ?? colors.textSecondary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {tintLayer?.underlay?.map(([type, { key, ...attributes }]) => {
        const Element = elementFor(type);
        if (!Element) {
          return null;
        }

        return (
          <Element
            key={key}
            {...attributes}
            fill={tintColor}
            fillOpacity={TINT_OPACITY}
          />
        );
      })}
      {icon.map(([type, { key, ...attributes }], index) => {
        const Element = elementFor(type);
        if (!Element) {
          return null;
        }
        const isFilled = filled?.has(index) ?? true;

        return (
          <Element
            key={key}
            {...attributes}
            stroke={outlineColor}
            fill={isFilled ? tintColor : "none"}
            fillOpacity={TINT_OPACITY}
          />
        );
      })}
    </Svg>
  );
};
