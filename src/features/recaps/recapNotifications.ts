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

/** Bigger periods win when several end on the same day. */
const RANK: Record<RecapNotificationKind, number> = {
  week: 0,
  month: 1,
  year: 2,
};

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
 * - One notification per day: when periods end on the same day, the
 *   biggest wins (year over month over week)
 * - Defaults keep reminders (60) plus recaps within the 64 notifications
 *   iOS keeps scheduled; the app reschedules on each new day
 * - Sorted by time
 */
export const getRecapNotifications = ({
  now,
  weekLocale,
  reminderTime,
  weeks = 2,
  months = 1,
  years = 1,
}: {
  now: Date;
  weekLocale: string;
  reminderTime: string;
  weeks?: number;
  months?: number;
  years?: number;
}): RecapNotification[] => {
  const all = [
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
  ];
  const byDay = new Map<DateKey, RecapNotification>();
  for (const notification of all) {
    const current = byDay.get(notification.periodEnd);
    if (!current || RANK[notification.kind] > RANK[current.kind]) {
      byDay.set(notification.periodEnd, notification);
    }
  }
  return [...byDay.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
};
