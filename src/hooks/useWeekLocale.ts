import { useCalendars } from "expo-localization";
import { Platform } from "react-native";
import { getWeekLocale } from "@/lib/translation";

/** Subscribe week grids to device calendar changes. */
export const useWeekLocale = (): string => {
  const [{ firstWeekday }] = useCalendars();
  if (firstWeekday === null) {
    return getWeekLocale({ weekStart: null });
  }
  // Expo's web implementation returns Intl's Monday=1, Sunday=7 directly.
  // Native calendars use Sunday=1, Saturday=7. Day.js uses Sunday=0.
  // https://github.com/expo/expo/blob/sdk-57/packages/expo-localization/src/ExpoLocalization.ts
  const weekStart = Platform.OS === "web" ? firstWeekday % 7 : firstWeekday - 1;
  return getWeekLocale({ weekStart });
};
