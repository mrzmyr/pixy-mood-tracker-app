import { Platform } from "react-native";
import {
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useIsReduceTransparencyEnabled } from "@/hooks/useIsReduceTransparencyEnabled";

/**
 * iOS 26+ with Liquid Glass. Some iOS 26 betas lack the glass API, so both
 * guards are checked.
 */
export const IS_GLASS_SUPPORTED =
  Platform.OS === "ios" &&
  isLiquidGlassAvailable() &&
  isGlassEffectAPIAvailable();

/**
 * True when glass may render now: OS supports it and Reduce Transparency is
 * off. When false, render a solid surface instead of glass or blur.
 */
// oxlint-disable-next-line pixy-standards/boolean-function-prefix -- React hooks must start with `use`.
export const useCanUseGlass = (): boolean => {
  const isReduceTransparencyEnabled = useIsReduceTransparencyEnabled();
  return IS_GLASS_SUPPORTED && !isReduceTransparencyEnabled;
};
