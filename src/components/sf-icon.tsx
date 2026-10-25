import { Image } from "expo-image";
import type { ReactElement } from "react";
import { Platform } from "react-native";

/**
 * SF Symbol on iOS, `fallback` elsewhere. Same glyphs as the native Settings
 * rows, for React Native rows that sit next to them.
 */
export const SFIcon = ({
  name,
  color,
  size = 22,
  fallback,
}: {
  /** SF Symbol name, for example `folder`. */
  name: string;
  color: string;
  size?: number;
  /** Android and web icon, for example a Lucide icon. */
  fallback: ReactElement;
}) =>
  Platform.OS === "ios" ? (
    <Image
      source={`sf:${name}`}
      tintColor={color}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  ) : (
    fallback
  );
