import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate } from "@/lib/logDates";
import type { LogItem } from "@/features/logs";
import { parseReminderTime } from "./reminderTime";

/**
 * Pending local notifications iOS keeps per app. It drops the latest ones
 * beyond this limit.
 */
export const IOS_SCHEDULED_LIMIT = 64;

/**
 * Most recap notifications scheduled at once (`getRecapNotifications`
 * defaults). `REMINDER_DAYS + RECAP_NOTIFICATION_SLOTS <= IOS_SCHEDULED_LIMIT`.
 */
export const RECAP_NOTIFICATION_SLOTS = 4;

/**
 * Days ahead that get a reminder, today included. Leaves
 * `RECAP_NOTIFICATION_SLOTS` of `IOS_SCHEDULED_LIMIT` for recaps. The app
 * reschedules on each new day, so the schedule stays ahead.
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
