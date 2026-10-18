import { reportError } from "@/lib/report-error";
import { useEffect, useMemo } from "react";
import { useLogLoad, useLogState } from "@/features/logs";
import { useToday } from "@/hooks/use-today";
import { createStructuredError } from "@/lib/errors";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { getLoggedDays, getReminderDates } from "./reminder-dates";
import { defaultReminderScheduler } from "./reminder-scheduler";
import type { ReminderScheduler } from "./reminder-scheduler";

/**
 * Keeps scheduled reminders in line with entries while the reminder is on.
 *
 * - Reschedules when an entry for today or a later day appears or goes away
 * - Reschedules on a new day (`useToday`), so the schedule keeps
 *   `REMINDER_DAYS` days ahead
 * - Replaces the repeating daily reminder of older app versions on launch
 * - Waits for stored settings and entries; never touches the schedule on a
 *   failed read
 */
export const useReminderSync = (
  scheduler: ReminderScheduler = defaultReminderScheduler
) => {
  const { settings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const { items } = useLogState();
  const isLogsReady = useLogLoad().status === "ready";
  const today = useToday();

  // Past days never change the schedule, so edits to old entries skip it.
  const upcomingKey = useMemo(
    () =>
      [...getLoggedDays(items)]
        .filter((date) => date >= today)
        .sort()
        .join(","),
    [items, today]
  );
  // New object on a new day or a changed upcoming day: both reschedule.
  const upcoming = useMemo(
    () => ({ today, loggedDays: new Set(upcomingKey.split(",")) }),
    [today, upcomingKey]
  );

  const { reminderEnabled, reminderTime } = settings;

  useEffect(() => {
    if (!isSettingsReady || !isLogsReady || !reminderEnabled) {
      return;
    }
    const dates = getReminderDates({
      time: reminderTime,
      now: new Date(),
      loggedDays: upcoming.loggedDays,
    });
    const sync = async () => {
      try {
        await scheduler.replace(dates);
      } catch (error) {
        const structuredError = createStructuredError({
          status: "reminder_schedule_failed",
          message: "Reminders could not be scheduled",
          why: `expo-notifications failed: ${error instanceof Error ? error.message : String(error)}`,
          fix: "Open Pixy again or turn the reminder off and on in Settings",
        });
        console.error(structuredError);
        reportError(structuredError);
      }
    };
    void sync();
  }, [
    isSettingsReady,
    isLogsReady,
    reminderEnabled,
    reminderTime,
    upcoming,
    scheduler,
  ]);
};
