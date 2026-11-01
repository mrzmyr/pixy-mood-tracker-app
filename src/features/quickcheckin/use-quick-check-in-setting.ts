import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSettings } from "@/state/settings";
import type { QuickCheckInSchedule } from "@/state/settings";
import { getQuickCheckInTimes } from "./quick-check-in-schedule";

/** Quick check-ins arrive as notifications: every native platform. */
export const IS_QUICK_CHECK_IN_SUPPORTED = Platform.OS !== "web";

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
 * - `setEnabled(true)`: ask notification permission first; the check-ins
 *   arrive as notifications. Denied permission keeps it off
 * - `setEnabled(false)`: save off, never touches permission
 * - `setSchedule`: save new times; `QuickCheckInReminders` reschedules
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
    if (!value || platform === "web") {
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

  const setSchedule = (schedule: QuickCheckInSchedule) => {
    setSettings((current) => ({ ...current, quickCheckInSchedule: schedule }));
    analytics.track("quick_check_in:schedule_changed", {
      every_hours: schedule.everyHours,
      from: schedule.from,
      until: schedule.until,
      times_count: getQuickCheckInTimes(schedule).length,
    });
  };

  return {
    isAvailable: IS_QUICK_CHECK_IN_SUPPORTED && isFlagOn,
    isEnabled: settings.quickCheckInEnabled,
    setEnabled,
    schedule: settings.quickCheckInSchedule,
    setSchedule,
  };
};
