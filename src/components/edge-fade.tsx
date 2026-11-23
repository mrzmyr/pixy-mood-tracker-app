import { LinearGradient } from "expo-linear-gradient";

const FADE_SIZE = 40;

/**
 * Fade over one edge of a scroll view with hidden content there, from
 * `color` to `transparentColor` ([DESIGN.md](../../DESIGN.md#layout)). Use
 * the exact color of the surface behind it. Place it in a
 * `position: "relative"` parent around the scroll view.
 */
export const EdgeFade = ({
  edge,
  isVisible,
  color,
  transparentColor,
  size = FADE_SIZE,
}: {
  edge: "left" | "right" | "top" | "bottom";
  /** False at the start or end of the scroll: no hidden content there. */
  isVisible: boolean;
  color: string;
  /** `color` at zero alpha, so the gradient stays one hue. */
  transparentColor: string;
  size?: number;
}) => {
  const isHorizontal = edge === "left" || edge === "right";
  const isLeading = edge === "left" || edge === "top";
  return (
    <LinearGradient
      pointerEvents="none"
      colors={isLeading ? [color, transparentColor] : [transparentColor, color]}
      start={{ x: 0, y: 0 }}
      end={isHorizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }}
      style={{
        position: "absolute",
        opacity: isVisible ? 1 : 0,
        ...(isHorizontal
          ? { top: 0, bottom: 0, width: size, [edge]: 0 }
          : { left: 0, right: 0, height: size, [edge]: 0 }),
      }}
    />
  );
};
