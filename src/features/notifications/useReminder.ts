import { useSettings } from "@/state/settings";
import { defaultReminderScheduler } from "./reminderScheduler";
import type { ReminderScheduler } from "./reminderScheduler";
import { parseReminderTime, toReminderTime } from "./reminderTime";

/** Outcome of `enable()` and `disable()`. */
export type ReminderResult =
  | { status: "enabled"; time: string }
  | { status: "permission_denied" }
  | { status: "disabled"; permissionGranted: boolean };

/**
 * Daily reminder: permission, schedule, and the stored `reminderEnabled` and
 * `reminderTime` (`HH:mm`) settings.
 *
 * - `enable(time)`: ask permission, replace all scheduled notifications with
 *   one daily reminder, save. Denied permission changes nothing.
 * - `disable()`: cancel all scheduled notifications, save.
 * - `setTime(time)`: save the time. Reschedule when enabled, else cancel all.
 *   Never asks for permission.
 */
export const useReminder = (
  scheduler: ReminderScheduler = defaultReminderScheduler
) => {
  const { settings, setSettings } = useSettings();

  const save = (
    patch: Partial<Pick<typeof settings, "reminderEnabled" | "reminderTime">>
  ) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const enable = async (
    time: Date | string
  ): Promise<Exclude<ReminderResult, { status: "disabled" }>> => {
    const granted =
      (await scheduler.hasPermission()) ||
      (await scheduler.requestPermission());
    if (!granted) {
      return { status: "permission_denied" };
    }

    const reminderTime = toReminderTime(time);
    const { hour, minute } = parseReminderTime(reminderTime);
    await scheduler.replaceDaily(hour, minute);
    save({ reminderEnabled: true, reminderTime });
    return { status: "enabled", time: reminderTime };
  };

  const disable = async (): Promise<
    Extract<ReminderResult, { status: "disabled" }>
  > => {
    const permissionGranted = await scheduler.hasPermission();
    await scheduler.cancelAll();
    save({ reminderEnabled: false });
    return { status: "disabled", permissionGranted };
  };

  const setTime = async (time: Date | string) => {
    const reminderTime = toReminderTime(time);
    if (settings.reminderEnabled) {
      const { hour, minute } = parseReminderTime(reminderTime);
      await scheduler.replaceDaily(hour, minute);
    } else {
      await scheduler.cancelAll();
    }
    save({ reminderTime });
  };

  return {
    enabled: settings.reminderEnabled,
    time: settings.reminderTime,
    enable,
    disable,
    setTime,
  };
};
