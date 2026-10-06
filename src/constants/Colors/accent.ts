import colors from "@/constants/Colors/TailwindColors";

/**
 * Accent colors per platform. Android uses a fixed brand green (Pixy icon
 * emerald). Dynamic color (PlatformColor) is not safe: tint feeds
 * `interpolateColor` worklets, widget data and string math.
 */
export const getAccent = (os: string) => {
  if (os === "android") {
    return {
      tintLight: colors.emerald[700],
      tintDark: colors.emerald[400],
      // Dark fill behind white text. Emerald 400 fails 4.5:1 there.
      buttonDark: colors.emerald[700],
    };
  }
  return {
    tintLight: "#007aff",
    tintDark: "#0a84ff",
    buttonDark: "#0a84ff",
  };
};
