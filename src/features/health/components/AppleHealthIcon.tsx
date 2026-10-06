import { useState } from "react";
import { Image, Platform } from "react-native";

/**
 * Apple's Health app icon from the iOS asset catalog. Prebuild adds it
 * (`tools/expo-plugins/withAppleHealthIcon.cjs`); the repository never holds
 * it. Renders nothing outside iOS or without the icon.
 *
 * Apple's rules: show "Apple Health" close to the icon, never use it as a
 * button, never change its look.
 */
export const AppleHealthIcon = ({ size }: { size: number }) => {
  const [isMissing, setIsMissing] = useState(false);
  if (Platform.OS !== "ios" || isMissing) {
    return null;
  }
  return (
    <Image
      source={{ uri: "AppleHealthIcon" }}
      style={{ width: size, height: size }}
      accessibilityIgnoresInvertColors
      onError={() => setIsMissing(true)}
    />
  );
};
