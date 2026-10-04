import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";

/** Month metadata stays lightweight even after years of history are loaded. */
export interface Month {
  /** First day, also the stable list key. */
  date: string;
  /** Locale-aware number of calendar rows. */
  weeks: number;
}

/** Build chronological months using the current locale's first weekday. */
export const getMonths = ({
  end,
  count,
  locale,
}: {
  end: string;
  count: number;
  locale: string;
}): Month[] => {
  const first = dayjs(end)
    .locale(locale)
    .startOf("month")
    .subtract(count - 1, "month");
  return Array.from({ length: count }, (_, index) => {
    const month = first.add(index, "month");
    const leadingDays = month.diff(month.startOf("week"), "day");
    return {
      date: month.format(DATE_FORMAT),
      weeks: Math.ceil((leadingDays + month.daysInMonth()) / 7),
    };
  });
};

/** Match the grid's horizontal margins and scaled, single-line month title exactly. */
export const getGeometry = ({
  width,
  fontScale,
  isAndroid,
}: {
  width: number;
  fontScale: number;
  isAndroid: boolean;
}) => ({
  weekHeight: (width - 32 - (isAndroid ? 2 : 0) + 8) / 7,
  titleHeight: Math.ceil(22 * fontScale) + 28,
});

/** Years from `first` to `last` (inclusive) as `YYYY` strings, oldest first. */
export const getYears = ({
  first,
  last,
}: {
  first: number;
  last: number;
}): string[] =>
  Array.from({ length: Math.max(last - first, 0) + 1 }, (_, index) =>
    String(Math.min(first, last) + index)
  );

/**
 * Six week rows of one month for the year view, aligned to the locale's first
 * weekday. `null` fills slots outside the month, so every month has the same
 * height.
 */
export const getMonthGrid = ({
  month,
  locale,
}: {
  month: string;
  locale: string;
}): (string | null)[][] => {
  const start = dayjs(month).locale(locale).startOf("month");
  const leadingDays = start.diff(start.startOf("week"), "day");
  const daysInMonth = start.daysInMonth();
  return Array.from({ length: 6 }, (_week, row) =>
    Array.from({ length: 7 }, (_day, column) => {
      const day = row * 7 + column - leadingDays;
      return day >= 0 && day < daysInMonth
        ? start.add(day, "day").format(DATE_FORMAT)
        : null;
    })
  );
};

/** The seven dates of the locale week that contains `date`. */
export const getWeekDays = ({
  date,
  locale,
}: {
  date: string;
  locale: string;
}): string[] => {
  const start = dayjs(date).locale(locale).startOf("week");
  return Array.from({ length: 7 }, (_, index) =>
    start.add(index, "day").format(DATE_FORMAT)
  );
};

/**
 * Side-by-side lanes for one day column of the week view. Each entry covers
 * `minutes` to `minutes + span`. Overlapping entries share a group and split
 * its width into `lanes`, like events in a calendar app.
 */
export const layoutDayEntries = <T extends { minutes: number }>(
  entries: T[],
  span: number
): (T & { lane: number; lanes: number })[] => {
  const sorted = [...entries].sort((a, b) => a.minutes - b.minutes);
  const result: (T & { lane: number; lanes: number })[] = [];
  let group: (T & { lane: number; lanes: number })[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const entry of group) {
      entry.lanes = laneEnds.length;
    }
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const entry of sorted) {
    if (entry.minutes >= groupEnd) {
      closeGroup();
    }
    let lane = laneEnds.findIndex((end) => end <= entry.minutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = entry.minutes + span;
    groupEnd = Math.max(groupEnd, entry.minutes + span);
    group.push({ ...entry, lane, lanes: 1 });
  }
  closeGroup();
  return result;
};
