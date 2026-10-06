import dayjs from "dayjs";
import { locale } from "@/lib/translation";

/** Stored reminder time format. */
const REMINDER_TIME_FORMAT = "HH:mm";

/**
 * Today's date at a stored reminder time (`HH:mm`), for the time picker.
 */
export const reminderTimeToDate = (time: string): Date => {
  const [hour, minute] = time.split(":").map(Number);
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0).toDate();
};

/** Stored reminder time (`HH:mm`) for a picker date or a stored time. */
export const toReminderTime = (time: Date | string): string =>
  dayjs(time instanceof Date ? time : reminderTimeToDate(time)).format(
    REMINDER_TIME_FORMAT
  );

/** Hour and minute of a stored reminder time (`HH:mm`). */
export const parseReminderTime = (time: string) => {
  const date = reminderTimeToDate(time);
  return { hour: date.getHours(), minute: date.getMinutes() };
};

/** Reminder time for display, in the device locale (`20:00`, `8:00 PM`). */
export const formatReminderTime = (date: Date): string =>
  date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
