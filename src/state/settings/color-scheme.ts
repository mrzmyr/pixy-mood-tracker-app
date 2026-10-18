import { Appearance, Platform } from "react-native";
import { z } from "zod";

/** Theme choice. `system` follows the device setting. */
export const COLOR_SCHEMES = ["system", "light", "dark"] as const;

/** One of {@link COLOR_SCHEMES}. */
export type ColorSchemeSetting = (typeof COLOR_SCHEMES)[number];

/** Stored theme. */
export const ColorSchemeSettingSchema = z.enum(COLOR_SCHEMES);

/**
 * Overrides the color scheme for the whole app, so `useColorScheme` and
 * native views follow it. Web has no override.
 */
export const applyColorScheme = (colorScheme: ColorSchemeSetting) => {
  if (Platform.OS === "web") {
    return;
  }
  Appearance.setColorScheme(
    colorScheme === "system" ? "unspecified" : colorScheme
  );
};
