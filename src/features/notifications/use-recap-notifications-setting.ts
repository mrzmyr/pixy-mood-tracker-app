import { useSettings } from "@/state/settings";
import { defaultReminderScheduler } from "./reminder-scheduler";
import type { ReminderScheduler } from "./reminder-scheduler";

/** Outcome of `setEnabled`. */
export interface RecapNotificationsSettingResult {
  /** Notification permission; only checked when turning on. */
  permissionGranted?: boolean;
}

/**
 * Stored `recapNotificationsEnabled` setting. The recaps feature schedules
 * the notifications (`useRecapNotificationSync`).
 *
 * - `setEnabled(true)`: ask permission. Denied permission keeps it off
 * - `setEnabled(false)`: save off. Never touches permission, so no system
 *   prompt or alert appears
 */
export const useRecapNotificationsSetting = (
  scheduler: Pick<
    ReminderScheduler,
    "hasPermission" | "requestPermission"
  > = defaultReminderScheduler
) => {
  const { settings, setSettings } = useSettings();

  const save = (value: boolean) => {
    setSettings((current) => ({
      ...current,
      recapNotificationsEnabled: value,
    }));
  };

  const setEnabled = async (
    value: boolean
  ): Promise<RecapNotificationsSettingResult> => {
    if (!value) {
      save(false);
      return {};
    }
    const permissionGranted =
      (await scheduler.hasPermission()) ||
      (await scheduler.requestPermission());
    if (permissionGranted) {
      save(true);
    }
    return { permissionGranted };
  };

  return { enabled: settings.recapNotificationsEnabled, setEnabled };
};
