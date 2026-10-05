import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate } from "@/lib/logDates";
import type { LogItem } from "@/features/logs";
import { parseReminderTime } from "./reminderTime";

/**
 * Days ahead that get a reminder, today included. iOS keeps at most 64
 * pending local notifications per app, and Pixy schedules no others.
 */
export const REMINDER_DAYS = 60;

/** Local days (`DATE_FORMAT`) with at least one entry. */
export const getLoggedDays = (items: LogItem[]): Set<string> =>
  new Set(items.map(getItemDate));

/**
 * One reminder per day for `REMINDER_DAYS` days from `now`, at the stored
 * reminder time (`HH:mm`).
 *
 * - Skips days in `loggedDays`: no reminder once the day has an entry
 * - Skips today when the reminder time already passed
 */
export const getReminderDates = ({
  time,
  now,
  loggedDays,
}: {
  time: string;
  now: Date;
  loggedDays: ReadonlySet<string>;
}): Date[] => {
  const { hour, minute } = parseReminderTime(time);
  const first = dayjs(now).hour(hour).minute(minute).second(0).millisecond(0);
  const dates: Date[] = [];
  for (let day = 0; day < REMINDER_DAYS; day += 1) {
    const date = first.add(day, "day");
    if (date.isAfter(now) && !loggedDays.has(date.format(DATE_FORMAT))) {
      dates.push(date.toDate());
    }
  }
  return dates;
};
