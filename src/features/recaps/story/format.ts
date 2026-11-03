import dayjs from "dayjs";
import { getLocale } from "@/lib/translation";
import type { DateKey } from "../types";

const format = (date: DateKey, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(getLocale(), options).format(dayjs(date).toDate());

/** "September". */
export const monthName = (date: DateKey) => format(date, { month: "long" });

/** "September 2026". */
export const monthYear = (date: DateKey) =>
  format(date, { month: "long", year: "numeric" });

/** "Saturday, Oct 4". */
export const weekdayDay = (date: DateKey) =>
  format(date, { weekday: "long", month: "short", day: "numeric" });

/** "Sep 6". */
export const shortDay = (date: DateKey) =>
  format(date, { month: "short", day: "numeric" });

/** "Sep 1 – Sep 7". Hermes lacks `formatRange`, so both ends are full days. */
export const dayRange = (start: DateKey, end: DateKey) =>
  `${shortDay(start)} – ${shortDay(end)}`;
