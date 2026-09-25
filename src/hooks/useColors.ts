import type { Theme } from "@react-navigation/native";
import { useTheme } from "@react-navigation/native";
import type { IColors } from "@/constants/Colors";

/**
 * Current theme colors. Must render inside the app's `NavigationContainer`,
 * which receives the light or dark theme.
 */
export default function useColors(): IColors {
  // SAFETY: NavigationContainer receives Colors.light or Colors.dark as its theme colors.
  const { colors } = useTheme() as Theme & { colors: IColors };
  return colors;
}
