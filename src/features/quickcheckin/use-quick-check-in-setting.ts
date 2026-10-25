import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { native } from "./notification/native-module";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSettings } from "@/state/settings";

/** iOS opens the quick check-in screen, Android an ongoing notification. */
export const IS_QUICK_CHECK_IN_SUPPORTED =
  Platform.OS === "ios" || native !== null;

/**
 * Notification permission for the check-in notification. Local
 * notifications also work on emulators, so unlike reminders there is no
 * device check.
 */
const notificationPermission = {
  hasPermission: async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  },
  requestPermission: async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  },
};

/**
 * Stored `quickCheckInEnabled` setting.
 *
 * - `isAvailable`: platform supports it and the `quick-check-in` flag is on
 * - `setEnabled(true)` on Android: ask notification permission first.
 *   Denied permission keeps it off. iOS opens a screen and needs none.
 * - `setEnabled(false)`: save off, never touches permission
 */
export const useQuickCheckInSetting = (
  permission: {
    hasPermission: () => Promise<boolean>;
    requestPermission: () => Promise<boolean>;
  } = notificationPermission,
  platform: typeof Platform.OS = Platform.OS
) => {
  const { settings, setSettings } = useSettings();
  const isFlagOn = useFeatureFlag("quick-check-in");
  const analytics = useAnalytics();

  const save = (value: boolean) => {
    setSettings((current) => ({ ...current, quickCheckInEnabled: value }));
    analytics.track("quick_check_in:setting_changed", { enabled: value });
  };

  const setEnabled = async (value: boolean) => {
    if (!value || platform !== "android") {
      save(value);
      return { permissionGranted: true };
    }
    const permissionGranted =
      (await permission.hasPermission()) ||
      (await permission.requestPermission());
    if (permissionGranted) {
      save(true);
    }
    return { permissionGranted };
  };

  return {
    isAvailable: IS_QUICK_CHECK_IN_SUPPORTED && isFlagOn,
    isEnabled: settings.quickCheckInEnabled,
    setEnabled,
  };
};
