import dayjs from "dayjs";
import type { DateKey } from "../types";

/** Days of the new month the Calendar still shows last month's story. */
const CALENDAR_DAYS = 2;

/**
 * Month whose story the Calendar offers today: the current month on its
 * last day (the recap notification goes out then), the month before on
 * the first 2 days of a month, else none.
 */
export const getCalendarStoryMonth = (today: DateKey): DateKey | null => {
  const day = dayjs(today);
  if (day.date() === day.daysInMonth()) {
    return day.startOf("month").format("YYYY-MM-DD");
  }
  if (day.date() <= CALENDAR_DAYS) {
    return day.subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  }
  return null;
};
