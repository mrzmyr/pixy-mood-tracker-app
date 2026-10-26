import dayjs from "dayjs";
import {
  parseReminderTime,
  QUICK_CHECK_IN_NOTIFICATION_SLOTS,
} from "@/features/notifications";
import type { LogItem } from "@/features/logs";
import type { QuickCheckInSchedule } from "@/state/settings";

/** Days ahead the schedule looks at, today included. */
const MAX_DAYS = 14;

/**
 * Check-in times of one day (`HH:mm`): `from`, then every `everyHours`
 * hours up to `until`, both included. Empty when `until` is before `from`
 * or a time is not `HH:mm`.
 */
export const getQuickCheckInTimes = ({
  from,
  until,
  everyHours,
}: QuickCheckInSchedule): string[] => {
  const start = parseReminderTime(from);
  const end = parseReminderTime(until);
  if (Number.isNaN(start.hour) || Number.isNaN(end.hour) || everyHours <= 0) {
    return [];
  }
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const times: string[] = [];
  for (
    let minutes = startMinutes;
    minutes <= endMinutes;
    minutes += everyHours * 60
  ) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    times.push(`${hour}:${minute}`);
  }
  return times;
};

/** Time of the newest entry, or `null` without entries. */
export const getLastEntryAt = (items: readonly LogItem[]): Date | null => {
  let last: number | null = null;
  for (const item of items) {
    const time = Date.parse(item.dateTime);
    if (!Number.isNaN(time) && (last === null || time > last)) {
      last = time;
    }
  }
  return last === null ? null : new Date(last);
};

/**
 * Upcoming quick check-in notification dates, oldest first, at most
 * `QUICK_CHECK_IN_NOTIFICATION_SLOTS`.
 *
 * - Only times after `now`
 * - Skips a time less than `everyHours` hours after `lastEntryAt`: the
 *   user just checked in
 */
export const getQuickCheckInDates = ({
  schedule,
  now,
  lastEntryAt,
  slots = QUICK_CHECK_IN_NOTIFICATION_SLOTS,
}: {
  schedule: QuickCheckInSchedule;
  now: Date;
  lastEntryAt: Date | null;
  slots?: number;
}): Date[] => {
  const times = getQuickCheckInTimes(schedule).map(parseReminderTime);
  const quietUntil = lastEntryAt
    ? dayjs(lastEntryAt).add(schedule.everyHours, "hour")
    : null;
  const today = dayjs(now).startOf("day");
  const dates: Date[] = [];
  for (let day = 0; day < MAX_DAYS && dates.length < slots; day += 1) {
    for (const { hour, minute } of times) {
      const date = today.add(day, "day").hour(hour).minute(minute);
      const isQuiet = quietUntil !== null && date.isBefore(quietUntil);
      if (date.isAfter(now) && !isQuiet && dates.length < slots) {
        dates.push(date.toDate());
      }
    }
  }
  return dates;
};
