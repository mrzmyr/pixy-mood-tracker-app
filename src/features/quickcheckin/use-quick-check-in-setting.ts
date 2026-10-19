import { Platform } from "react-native";
import { defaultReminderScheduler } from "@/features/notifications";
import { IS_LIVE_ACTIVITY_SUPPORTED } from "./live-activity/support";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSettings } from "@/state/settings";

/** iOS 26 Live Activity. */
export const IS_QUICK_CHECK_IN_SUPPORTED = IS_LIVE_ACTIVITY_SUPPORTED;

/**
 * Stored `quickCheckInEnabled` setting.
 *
 * - `isAvailable`: platform supports it and the `quick-check-in` flag is on
 * - `setEnabled(true)` on Android: ask notification permission first.
 *   Denied permission keeps it off. iOS needs no permission for Live
 *   Activities.
 * - `setEnabled(false)`: save off, never touches permission
 */
export const useQuickCheckInSetting = (
  permission: {
    hasPermission: () => Promise<boolean>;
    requestPermission: () => Promise<boolean>;
  } = defaultReminderScheduler,
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
