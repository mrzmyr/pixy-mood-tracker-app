import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

// Android renders only image icons in the header; iOS uses SF Symbols.
const ICONS =
  Platform.OS === "ios"
    ? ({ calendar: "calendar", home: "list.bullet" } as const)
    : {
        calendar: require("../../../assets/images/icons/calendar.png"),
        home: require("../../../assets/images/icons/list.png"),
      };

/**
 * Header button props that swap Home and Calendar (flag `home-week`).
 * `target` is the screen the button opens. Render it as
 * `Stack.Toolbar.Button` on the left. `null` with the flag off.
 */
export const useViewSwitch = (target: "home" | "calendar") => {
  const router = useRouter();
  const isEnabled = useFeatureFlag("home-week");

  if (!isEnabled) {
    return null;
  }

  return {
    icon: ICONS[target],
    accessibilityLabel: target === "home" ? t("today") : t("calendar"),
    onPress: () => router.replace(target === "home" ? "/home" : "/calendar"),
  };
};
