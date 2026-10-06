import { Platform } from "react-native";
import type { PressableAndroidRippleConfig } from "react-native";

import useColors from "@/hooks/useColors";

/**
 * Android press ripple from the `pressRipple` color token. Returns
 * `undefined` on other platforms, so iOS keeps its own press feedback.
 * Bounded by default: pair with `overflow: "hidden"` on the pressable so the
 * ripple follows its border radius. Pass `borderless` for icon-only buttons.
 */
export default function usePressRipple(
  options: Omit<PressableAndroidRippleConfig, "color"> = {}
): PressableAndroidRippleConfig | undefined {
  const colors = useColors();
  if (Platform.OS !== "android") {
    return undefined;
  }
  return { color: colors.pressRipple, ...options };
}
