import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/config";

/**
 * First day of the week of `date`. `weekLocale` from `useWeekLocale` sets
 * the first weekday, like the calendar grid.
 */
export const getWeekStart = (date: string, weekLocale: string) =>
  dayjs(date).locale(weekLocale).startOf("week").format(DATE_FORMAT);

/**
 * Same weekday as `date` in the week of `weekStart`, but never after
 * `today`. Keeps the weekday when the user swipes to another week.
 */
export const moveToWeek = (
  date: string,
  weekStart: string,
  today: string,
  weekLocale: string
) => {
  const offset = dayjs(date).diff(dayjs(getWeekStart(date, weekLocale)), "day");
  const moved = dayjs(weekStart).add(offset, "day").format(DATE_FORMAT);
  return moved > today ? today : moved;
};
