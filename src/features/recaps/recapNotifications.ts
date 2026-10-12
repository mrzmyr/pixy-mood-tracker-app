import dayjs from "dayjs";
import { getPeriod, shiftPeriod } from "./period";
import type { DateKey } from "./types";

/** Period kinds with a recap notification. Quarters get none. */
export type RecapNotificationKind = "week" | "month" | "year";

/** One upcoming recap notification. */
export interface RecapNotification {
  kind: RecapNotificationKind;
  /** Last day of the period, `YYYY-MM-DD`. */
  periodEnd: DateKey;
  /** Last day of the period at the reminder time, local. */
  at: Date;
}

const FORMAT = "YYYY-MM-DD";

const atReminderTime = (date: DateKey, reminderTime: string): Date => {
  const [hour, minute] = reminderTime.split(":").map(Number);
  return dayjs(date)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .toDate();
};

const getUpcoming = ({
  kind,
  count,
  now,
  weekLocale,
  reminderTime,
}: {
  kind: RecapNotificationKind;
  count: number;
  now: Date;
  weekLocale: string;
  reminderTime: string;
}): RecapNotification[] => {
  const notifications: RecapNotification[] = [];
  let period = getPeriod(kind, dayjs(now).format(FORMAT), weekLocale);
  while (notifications.length < count) {
    const at = atReminderTime(period.end, reminderTime);
    if (at > now) {
      notifications.push({ kind, periodEnd: period.end, at });
    }
    period = shiftPeriod(period, 1, weekLocale);
  }
  return notifications;
};

/**
 * Upcoming recap notifications: the last day of the next `weeks` weeks,
 * `months` months, and `years` years, at `reminderTime` (`HH:mm`, local).
 *
 * - Weeks end on the last day of `weekLocale` (`useWeekLocale`)
 * - Includes the current period while its time is after `now`
 * - Sorted by time; on a shared day weeks come before months, months
 *   before years
 */
export const getRecapNotifications = ({
  now,
  weekLocale,
  reminderTime,
  weeks = 4,
  months = 3,
  years = 1,
}: {
  now: Date;
  weekLocale: string;
  reminderTime: string;
  weeks?: number;
  months?: number;
  years?: number;
}): RecapNotification[] =>
  [
    ...getUpcoming({
      kind: "week",
      count: weeks,
      now,
      weekLocale,
      reminderTime,
    }),
    ...getUpcoming({
      kind: "month",
      count: months,
      now,
      weekLocale,
      reminderTime,
    }),
    ...getUpcoming({
      kind: "year",
      count: years,
      now,
      weekLocale,
      reminderTime,
    }),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
