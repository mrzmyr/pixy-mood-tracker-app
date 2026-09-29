import { useTheme } from "expo-router";
import type { Theme } from "expo-router";

import type { IColors } from "@/constants/Colors";

/**
 * Current theme colors. Must render inside the app's `ThemeProvider`,
 * which receives the light or dark theme.
 */
export default function useColors(): IColors {
  // SAFETY: App ThemeProvider adds every IColors key to the Router theme.
  const { colors } = useTheme() as Theme & { colors: IColors };
  return colors;
}
