import type { LucideIcon } from "lucide-react-native";
import type { SFSymbol, SymbolWeight } from "expo-symbols";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";

/**
 * Props of the shared icon: SF Symbol on iOS, Lucide icon elsewhere.
 * Decorative unless `accessibilityLabel` is set.
 */
export interface IconProps extends Pick<
  ViewProps,
  | "accessibilityElementsHidden"
  | "importantForAccessibility"
  | "accessibilityLabel"
> {
  /** SF Symbol name, iOS only. */
  sf: SFSymbol;
  /** Lucide icon for Android and web. */
  fallback: LucideIcon;
  size: number;
  /** Symbol tint on iOS, stroke color of the Lucide icon elsewhere. */
  color: string;
  /**
   * Shape fill. Lucide fills the shape. iOS draws a palette symbol: `color`
   * on the primary layer (the glyph, for example the check of
   * `checkmark.circle.fill`), `fill` on the secondary layer (the circle).
   */
  fill?: string;
  /** Lucide stroke width. iOS picks the matching symbol weight. */
  strokeWidth?: number;
  /** SF Symbol weight override, iOS only. */
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  "aria-hidden"?: boolean;
}

/**
 * Android and web: renders the Lucide `fallback`. iOS renders the SF Symbol
 * (`Icon.ios.tsx`).
 */
const Icon = ({
  sf: _sf,
  weight: _weight,
  fallback: Fallback,
  ...props
}: IconProps) => <Fallback {...props} />;

export default Icon;
