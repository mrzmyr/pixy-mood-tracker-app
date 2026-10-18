import dayjs from "dayjs";
import type { DateKey, Period, PeriodKind } from "./types";

const FORMAT = "YYYY-MM-DD";

/**
 * Calendar period of `kind` that holds `date`. Weeks start on the first day
 * of `weekLocale` (`useWeekLocale`); quarters start in January, April, July,
 * and October.
 */
export const getPeriod = (
  kind: PeriodKind,
  date: DateKey,
  weekLocale: string
): Period => {
  const day = dayjs(date).locale(weekLocale);
  if (kind === "quarter") {
    const start = day.startOf("month").subtract(day.month() % 3, "month");
    return {
      kind,
      start: start.format(FORMAT),
      end: start.add(2, "month").endOf("month").format(FORMAT),
    };
  }
  return {
    kind,
    start: day.startOf(kind).format(FORMAT),
    end: day.endOf(kind).format(FORMAT),
  };
};

/** Period `offset` steps before (negative) or after `period`. */
export const shiftPeriod = (
  period: Period,
  offset: number,
  weekLocale: string
): Period => {
  const unit = period.kind === "quarter" ? "month" : period.kind;
  const steps = period.kind === "quarter" ? offset * 3 : offset;
  return getPeriod(
    period.kind,
    dayjs(period.start).add(steps, unit).format(FORMAT),
    weekLocale
  );
};

/** `date` lies between the first and last day of `period`, both included. */
export const isInPeriod = (date: DateKey, period: Period) =>
  date >= period.start && date <= period.end;
