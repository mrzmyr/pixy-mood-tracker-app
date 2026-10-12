import { useSettings } from "@/state/settings";
import { defaultReminderScheduler } from "./reminderScheduler";
import type { ReminderScheduler } from "./reminderScheduler";

/**
 * Stored `recapNotificationsEnabled` setting. The recaps feature schedules
 * the notifications (`useRecapNotificationSync`).
 *
 * - `setEnabled(true)`: ask permission. Denied permission keeps it off
 * - `setEnabled(false)`: save off
 * - Resolves whether notification permission is granted
 */
export const useRecapNotificationsSetting = (
  scheduler: Pick<
    ReminderScheduler,
    "hasPermission" | "requestPermission"
  > = defaultReminderScheduler
) => {
  const { settings, setSettings } = useSettings();

  const setEnabled = async (value: boolean) => {
    const permissionGranted = value
      ? (await scheduler.hasPermission()) ||
        (await scheduler.requestPermission())
      : await scheduler.hasPermission();
    if (!value || permissionGranted) {
      setSettings((current) => ({
        ...current,
        recapNotificationsEnabled: value,
      }));
    }
    return { permissionGranted };
  };

  return { enabled: settings.recapNotificationsEnabled, setEnabled };
};
