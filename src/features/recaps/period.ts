import dayjs from "dayjs";
import type { DateKey, Period, PeriodKind } from "./types";

const FORMAT = "YYYY-MM-DD";

/** Calendar period of `kind` that holds `date`. */
export const getPeriod = (kind: PeriodKind, date: DateKey): Period => {
  const day = dayjs(date);
  return {
    kind,
    start: day.startOf(kind).format(FORMAT),
    end: day.endOf(kind).format(FORMAT),
  };
};

/** Period `offset` steps before (negative) or after `period`. */
export const shiftPeriod = (period: Period, offset: number): Period =>
  getPeriod(
    period.kind,
    dayjs(period.start).add(offset, period.kind).format(FORMAT)
  );

/** `date` lies between the first and last day of `period`, both included. */
export const isInPeriod = (date: DateKey, period: Period) =>
  date >= period.start && date <= period.end;
