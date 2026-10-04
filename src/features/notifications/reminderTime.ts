import dayjs from "dayjs";

/**
 * Today's date at a stored reminder time (`HH:mm`), for the time picker.
 */
export const reminderTimeToDate = (time: string): Date => {
  const [hour, minute] = time.split(":").map(Number);
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0).toDate();
};
