import { useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import useColors from "@/hooks/use-colors";

/**
 * Apple's Health app icon from the iOS asset catalog. Prebuild adds it
 * (`tools/expo-plugins/with-apple-health-icon.cjs`); the repository never holds
 * it. Renders nothing outside iOS or without the icon.
 *
 * Apple's rules: show "Apple Health" close to the icon, never use it as a
 * button, never change its look. A hairline outline sits around the icon,
 * outside its pixels: the icon is a white tile and vanishes on white rows.
 */
export const AppleHealthIcon = ({ size }: { size: number }) => {
  const colors = useColors();
  const [isMissing, setIsMissing] = useState(false);
  if (Platform.OS !== "ios" || isMissing) {
    return null;
  }
  return (
    <View
      style={{
        padding: StyleSheet.hairlineWidth,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.healthIconBorder,
        // iOS app icon corner: 22.37% of the side, continuous curve.
        borderRadius: size * 0.2237,
        borderCurve: "continuous",
      }}
    >
      <Image
        source={{ uri: "AppleHealthIcon" }}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
        onError={() => setIsMissing(true)}
      />
    </View>
  );
};
