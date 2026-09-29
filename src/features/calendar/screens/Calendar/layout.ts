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
