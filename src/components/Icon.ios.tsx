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
 * Lucide SVGs never reached the accessibility tree, but a SymbolView reads
 * out its symbol name ("lock", "person"). Hide it unless the caller labels it.
 */
const DECORATIVE = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

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
  accessibilityLabel,
  ...props
}: IconProps) => (
  <SymbolView
    name={sf}
    size={size}
    // expo-symbols repaints the whole image in `tintColor` when it is set,
    // which flattens a palette symbol to one color. Palette mode gets colors only.
    {...(fill
      ? { type: "palette", colors: [color, fill] }
      : { type: "monochrome", tintColor: color })}
    weight={weight ?? weightForStroke(strokeWidth)}
    {...props}
    {...(accessibilityLabel
      ? { accessible: true, accessibilityRole: "image", accessibilityLabel }
      : DECORATIVE)}
  />
);

export default Icon;
