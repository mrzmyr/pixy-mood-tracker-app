import { DefaultTheme } from "expo-router";
import type { Theme } from "expo-router";

import Colors from "@/constants/colors";

/**
 * Router theme with every app color, so `useColors` works below it. Root
 * layout and the root error screen share it.
 */
export const getNavigationTheme = (scheme: string | null | undefined) => {
  const colors = scheme === "dark" ? Colors.dark : Colors.light;
  return {
    ...DefaultTheme,
    dark: scheme === "dark",
    colors: {
      ...DefaultTheme.colors,
      ...colors,
      primary: colors.tint,
      card: colors.background,
      border: colors.headerBorder,
      notification: colors.tint,
    },
  } satisfies Theme;
};
