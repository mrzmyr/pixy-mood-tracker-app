import type { LucideIcon } from "lucide-react-native";
import type { SFSymbol, SymbolWeight } from "expo-symbols";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";

/** Props of the shared icon: SF Symbol on iOS, Lucide icon elsewhere. */
export interface IconProps extends Pick<
  ViewProps,
  "accessibilityElementsHidden" | "importantForAccessibility"
> {
  /** SF Symbol name, iOS only. */
  sf: SFSymbol;
  /** Lucide icon for Android and web. */
  fallback: LucideIcon;
  size: number;
  /** Symbol tint on iOS, stroke color of the Lucide icon elsewhere. */
  color: string;
  /**
   * Shape fill. Lucide fills the shape; iOS draws a two-color palette
   * symbol with `color` on top of `fill`, for example `checkmark.circle.fill`.
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
