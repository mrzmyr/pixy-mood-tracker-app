import { Platform } from "react-native";
import { isGlassEffectAPIAvailable } from "expo-glass-effect";

/** iOS 26+: native Liquid Glass with its own shadow and press response. */
export const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();
/** Android: Material 3 FAB, 56 dp, 16 dp corners, elevation level 3, ripple. */
export const IS_ANDROID = Platform.OS === "android";
/** Size of the calendar float buttons. Add and voice buttons share it. */
export const SIZE = IS_ANDROID ? 56 : 54;
/** Corner radius of the calendar float buttons: circle, Material FAB on Android. */
export const RADIUS = IS_ANDROID ? 16 : SIZE / 2;
