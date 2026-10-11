import { useLogState } from "@/features/logs";
import { useSettings } from "@/state/settings";
import { getLoggedDays, getReminderDates } from "./reminderDates";
import { defaultReminderScheduler } from "./reminderScheduler";
import type { ReminderScheduler } from "./reminderScheduler";
import { toReminderTime } from "./reminderTime";

/** Outcome of `enable()` and `disable()`. */
export type ReminderResult =
  | { status: "enabled"; time: string }
  | { status: "permission_denied" }
  | { status: "disabled"; permissionGranted: boolean };

/**
 * Daily reminder: permission, schedule, and the stored `reminderEnabled` and
 * `reminderTime` (`HH:mm`) settings. Days with an entry get no reminder
 * (`getReminderDates`); `useReminderSync` keeps the schedule current.
 *
 * - `enable(time)`: ask permission, replace all scheduled notifications with
 *   the reminders of the coming days, save. Denied permission changes nothing.
 * - `disable()`: cancel all scheduled notifications, save.
 * - `setTime(time)`: save the time. Reschedule when enabled, else cancel all.
 *   Never asks for permission.
 */
export const useReminder = (
  scheduler: ReminderScheduler = defaultReminderScheduler
) => {
  const { settings, setSettings } = useSettings();
  const { items } = useLogState();

  const schedule = (reminderTime: string) =>
    scheduler.replace(
      getReminderDates({
        time: reminderTime,
        now: new Date(),
        loggedDays: getLoggedDays(items),
      })
    );

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
    await schedule(reminderTime);
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
    await (settings.reminderEnabled
      ? schedule(reminderTime)
      : scheduler.cancelAll());
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
