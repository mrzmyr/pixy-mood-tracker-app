import dayjs from "dayjs";
import { getLocale } from "@/lib/translation";
import type { DateKey } from "../types";

const format = (date: DateKey, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(getLocale(), options).format(dayjs(date).toDate());

/** "September". */
export const monthName = (date: DateKey) => format(date, { month: "long" });

/** "Sep 6". */
export const shortDay = (date: DateKey) =>
  format(date, { month: "short", day: "numeric" });

/** "Sunday". */
export const weekdayName = (date: DateKey) => format(date, { weekday: "long" });

/** "Sun". */
export const weekdayShort = (date: DateKey) =>
  format(date, { weekday: "short" });

/** "Sep 1 – Sep 7". Hermes lacks `formatRange`, so both ends are full days. */
export const dayRange = (start: DateKey, end: DateKey) =>
  `${shortDay(start)} – ${shortDay(end)}`;

/** A date with the given weekday, 0 Sunday to 6 Saturday. */
export const dateOfWeekday = (weekday: number) =>
  dayjs("2026-01-04").add(weekday, "day").format("YYYY-MM-DD");
