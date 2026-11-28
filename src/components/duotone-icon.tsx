import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import Svg from "react-native-svg";
import { elementFor } from "@/components/icons/create-icon";

/**
 * One id per icon object. Keys the Svg, so a new icon mounts new native
 * shapes: shapes share keys like "0" across icons, and react-native-svg keeps
 * props that a reused shape no longer has, for example a `transform`.
 */
// Icons are module constants, so the map stays small.
const iconIds = new Map<IconSvgObject, number>();
const iconIdOf = (icon: IconSvgObject) => {
  const known = iconIds.get(icon);
  if (known !== undefined) {
    return known;
  }
  const id = iconIds.size;
  iconIds.set(icon, id);
  return id;
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
 * Pixy two-tone icon: a tint layer at low opacity under an outline. Emotion
 * icons pass a Pixy glyph. Tag icons pass a Hugeicons free Stroke Rounded
 * outline (MIT) with Pixy's own tint layer.
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
    <Svg key={iconIdOf(icon)} width={size} height={size} viewBox="0 0 24 24">
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
