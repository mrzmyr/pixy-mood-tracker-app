import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { RADIUS } from "@/constants/radius";

const HAS_GLASS = Platform.OS === "ios" && isGlassEffectAPIAvailable();

/** Fallback without Liquid Glass: frosted, so the sky still shows through. */
const FALLBACK = {
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  dark: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
} as const;

/**
 * Transparent tile on a sky ({@link Sky}, {@link NightSky}): Liquid Glass on
 * iOS 26, a frosted fill elsewhere. No shadow. Rule: DESIGN.md, Tiles on
 * skies.
 */
export const SkyTile = ({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  return (
    <View
      style={[
        {
          borderRadius: RADIUS.lg,
          borderCurve: "continuous",
          overflow: "hidden",
        },
        !HAS_GLASS && { borderWidth: StyleSheet.hairlineWidth },
        !HAS_GLASS && FALLBACK[scheme],
        style,
      ]}
    >
      {HAS_GLASS && (
        <GlassView
          glassEffectStyle="regular"
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.lg }]}
        />
      )}
      {children}
    </View>
  );
};
