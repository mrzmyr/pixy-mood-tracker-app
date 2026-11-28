import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg";
import type { ColorValue } from "react-native";
import type { SvgProps } from "react-native-svg";
import type { Glyph, GlyphElement } from "./glyph";

const ELEMENTS = {
  circle: Circle,
  ellipse: Ellipse,
  line: Line,
  path: Path,
  polygon: Polygon,
  polyline: Polyline,
  rect: Rect,
} as const;

/** SVG element for a glyph shape. Unknown tags are skipped. */
export const elementFor = (type: GlyphElement[0]) => {
  if (!Object.hasOwn(ELEMENTS, type)) {
    return null;
  }
  // SAFETY: `hasOwn` checked that `type` is a key of ELEMENTS.
  return ELEMENTS[type as keyof typeof ELEMENTS];
};

/** Props of a Pixy icon: `SvgProps` plus `size` and `color`. */
export interface IconProps extends SvgProps {
  /** Width and height. Default 24. */
  size?: number;
  /** Line color. Default `currentColor`. */
  color?: ColorValue;
}

/** Pixy icon component, as made by {@link createIcon}. */
export type Icon = (props: IconProps) => React.JSX.Element;

/** Outline icon from a glyph. Takes `size`, `color`, and any `SvgProps`. */
export const createIcon = (glyph: Glyph): Icon => {
  const PixyIcon = ({
    size = 24,
    width = size,
    height = size,
    color = "currentColor",
    strokeWidth,
    fill = "none",
    ...rest
  }: IconProps) => (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      {...rest}
    >
      {glyph.outline.map(([type, { key, ...attributes }]) => {
        const Element = elementFor(type);
        if (!Element) {
          return null;
        }
        return (
          <Element
            key={key}
            {...attributes}
            strokeWidth={strokeWidth ?? attributes.strokeWidth}
          />
        );
      })}
    </Svg>
  );
  return PixyIcon;
};
