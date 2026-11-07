import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/config";
import { parseReminderTime } from "@/features/notifications";
import { getPeriod, shiftPeriod } from "./period";
import type { DateKey } from "./types";

/** Period kinds with a recap notification. */
export type RecapNotificationKind = "month" | "year";

/** One upcoming recap notification. */
export interface RecapNotification {
  kind: RecapNotificationKind;
  /** Last day of the period, `YYYY-MM-DD`. */
  periodEnd: DateKey;
  /** Last day of the period at the reminder time, local. */
  at: Date;
}

/** Bigger periods win when several end on the same day. */
const RANK: Record<RecapNotificationKind, number> = {
  month: 0,
  year: 1,
};

interface Time {
  hour: number;
  minute: number;
}

const atTime = (date: DateKey, { hour, minute }: Time): Date =>
  dayjs(date).hour(hour).minute(minute).second(0).millisecond(0).toDate();

const getUpcoming = ({
  kind,
  count,
  now,
  time,
}: {
  kind: RecapNotificationKind;
  count: number;
  now: Date;
  time: Time;
}): RecapNotification[] => {
  const notifications: RecapNotification[] = [];
  let period = getPeriod(kind, dayjs(now).format(DATE_FORMAT));
  // At most one period ends before `now`; the cap only guards against a
  // bad date so the loop can never spin.
  for (
    let step = 0;
    notifications.length < count && step < count * 4;
    step += 1
  ) {
    const at = atTime(period.end, time);
    if (at > now) {
      notifications.push({ kind, periodEnd: period.end, at });
    }
    period = shiftPeriod(period, 1);
  }
  return notifications;
};

/**
 * Upcoming recap notifications: the last day of the next `months` months
 * and `years` years, at `reminderTime` (`HH:mm`, local).
 *
 * - Includes the current period while its time is after `now`
 * - One notification per day: when periods end on the same day, the
 *   biggest wins (year over month)
 * - Defaults stay within `RECAP_NOTIFICATION_SLOTS`, so reminders plus
 *   recaps fit the 64 notifications iOS keeps; the app reschedules on each
 *   new day
 * - None for a `reminderTime` that is not `HH:mm`
 * - Sorted by time
 */
export const getRecapNotifications = ({
  now,
  reminderTime,
  months = 1,
  years = 1,
}: {
  now: Date;
  reminderTime: string;
  months?: number;
  years?: number;
}): RecapNotification[] => {
  const time = parseReminderTime(reminderTime);
  // Settings store `HH:mm`. A bad stored time schedules nothing; no error
  // report, since every sync would send the same one again.
  if (Number.isNaN(time.hour) || Number.isNaN(time.minute)) {
    return [];
  }
  const all = [
    ...getUpcoming({
      kind: "month",
      count: months,
      now,
      time,
    }),
    ...getUpcoming({
      kind: "year",
      count: years,
      now,
      time,
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
