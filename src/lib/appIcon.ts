import {
  getAppIconName,
  supportsAlternateIcons,
} from "expo-alternate-app-icons";
import { APP_ICONS } from "@/constants/AppIcons";
import type { AppIcon } from "@/constants/AppIcons";

const [DEFAULT_ICON] = APP_ICONS;

/**
 * Reads the active icon from the OS. Android reports the icon of the running
 * activity, so a change shows only after the app restarts.
 */
export const readActiveAppIcon = (): AppIcon => {
  if (!supportsAlternateIcons) {
    return DEFAULT_ICON;
  }
  const nativeName = getAppIconName();
  return (
    APP_ICONS.find((icon) => icon.nativeName === nativeName) ?? DEFAULT_ICON
  );
};
