import { SymbolView } from "expo-symbols";
import type { SymbolWeight } from "expo-symbols";
import type { IconProps } from "./Icon";

/** Lucide draws a 2 px stroke by default. */
const DEFAULT_STROKE_WIDTH = 2;

/** SF Symbol weight closest to a Lucide stroke width. */
const weightForStroke = (strokeWidth = DEFAULT_STROKE_WIDTH): SymbolWeight => {
  if (strokeWidth <= 1.5) {
    return "light";
  }
  if (strokeWidth < 2.5) {
    return "regular";
  }
  if (strokeWidth < 3) {
    return "semibold";
  }
  return "bold";
};

/**
 * iOS: SF Symbol, so icons follow the system look and Bold Text. Android and
 * web render the Lucide `fallback` (`Icon.tsx`).
 */
const Icon = ({
  sf,
  fallback: _fallback,
  size,
  color,
  fill,
  strokeWidth,
  weight,
  ...props
}: IconProps) => (
  <SymbolView
    name={sf}
    size={size}
    tintColor={color}
    type={fill ? "palette" : "monochrome"}
    colors={fill ? [color, fill] : undefined}
    weight={weight ?? weightForStroke(strokeWidth)}
    {...props}
  />
);

export default Icon;
