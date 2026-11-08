import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

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
export const TINT_OPACITY = 0.35;

/**
 * Own two-tone layer for one icon. Pixy draws these shapes. They are not from
 * Hugeicons.
 */
export interface DuotoneTint {
  /** Icon shapes, by index, that get the tint. Default: every shape. */
  fill?: readonly number[];
  /** Tint drawn under the outline, on the 24 by 24 icon grid. */
  underlay?: IconSvgObject;
}

/**
 * Pixy two-tone icon: a tint layer at low opacity under a Hugeicons free
 * Stroke Rounded outline (MIT). Hugeicons free has no two-tone style, so the
 * tint layer is Pixy's own. Used by emotion and tag icons.
 */
export const DuotoneIcon = ({
  icon,
  tintLayer,
  stroke,
  tint,
  size = 20,
  tintOpacity = TINT_OPACITY,
}: {
  icon: IconSvgObject;
  /** Where the tint goes. Default: every shape. */
  tintLayer?: DuotoneTint;
  /** Outline color. */
  stroke: string;
  /** Tint layer color, drawn at `tintOpacity`. */
  tint: string;
  size?: number;
  /** Tint opacity; higher on dark surfaces, like a selected chip. */
  tintOpacity?: number;
}) => {
  const filled = tintLayer?.fill ? new Set(tintLayer.fill) : null;

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
            fill={tint}
            fillOpacity={tintOpacity}
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
            stroke={stroke}
            fill={isFilled ? tint : "none"}
            fillOpacity={tintOpacity}
          />
        );
      })}
    </Svg>
  );
};
