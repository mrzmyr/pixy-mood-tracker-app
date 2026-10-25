import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/config";
import { getItemDate } from "@/lib/log-dates";
import type { LogItem } from "@/features/logs";
import { parseReminderTime } from "./reminder-time";

/**
 * Pending local notifications iOS keeps per app. It drops the latest ones
 * beyond this limit.
 */
export const IOS_SCHEDULED_LIMIT = 64;

/**
 * Most recap notifications scheduled at once (`getRecapNotifications`
 * defaults).
 */
export const RECAP_NOTIFICATION_SLOTS = 4;

/** Most quick check-in notifications scheduled at once. */
export const QUICK_CHECK_IN_NOTIFICATION_SLOTS = 30;

/**
 * Days ahead that get a reminder, today included. Together with recaps and
 * quick check-ins it stays within `IOS_SCHEDULED_LIMIT`:
 * `REMINDER_DAYS + RECAP_NOTIFICATION_SLOTS +
 * QUICK_CHECK_IN_NOTIFICATION_SLOTS <= IOS_SCHEDULED_LIMIT`. The app
 * reschedules on each new day and launch, so the schedule stays ahead.
 */
export const REMINDER_DAYS = 30;

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
