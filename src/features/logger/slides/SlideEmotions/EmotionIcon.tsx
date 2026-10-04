import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

/** SVG element for a Hugeicons shape type. Free icons use only these three. */
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
  return null;
};

/** Opacity of the tint that fills each shape under its stroke. */
const TINT_OPACITY = 0.35;

/**
 * Two-tone stroke icon: every shape is filled with `tint` at low opacity and
 * drawn with a `stroke` outline. Hugeicons free ships stroke icons only, so
 * the fill layer is added here.
 */
export const EmotionIcon = ({
  icon,
  stroke,
  tint,
  size = 20,
}: {
  icon: IconSvgObject;
  stroke: string;
  tint: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {icon.map(([type, { key, ...attributes }]) => {
      const Element = elementFor(type);
      if (!Element) {
        return null;
      }

      return (
        <Element
          key={key}
          {...attributes}
          stroke={stroke}
          fill={tint}
          fillOpacity={TINT_OPACITY}
        />
      );
    })}
  </Svg>
);
