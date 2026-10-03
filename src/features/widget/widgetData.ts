import dayjs from "dayjs";
import Colors from "@/constants/Colors";
import scales from "@/constants/Colors/Scales";
import { RATING_KEYS } from "@/constants/Ratings";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";
import { t } from "@/lib/translation";
import { PAD_CELL } from "./widgetProps";
import type {
  MonthWidgetProps,
  WeekWidgetProps,
  WidgetBaseProps,
  WidgetCell,
  WidgetRating,
  WidgetSchemeColors,
  YearDayCode,
  YearWidgetProps,
} from "./widgetProps";

/** Days of timeline entries. Each entry moves the today marker at local midnight. */
export const WIDGET_TIMELINE_DAYS = 7;

/**
 * The year widget gets one entry. WidgetKit renders and archives every
 * entry when it builds a timeline, and 7 renders of 372 cells push the
 * extension over its 30 MB limit (crash, widget never updates). The app
 * resyncs on every foreground, so the today marker lags at most one day.
 */
export const YEAR_WIDGET_TIMELINE_DAYS = 1;

/** Inputs shared by every widget props builder. `items` may be empty. */
export interface WidgetDataInput {
  items: LogItem[];
  /** Color scale key from settings, for example `ColorBrew-RdYlGn`. */
  scaleType: string;
  /** Deep link the widget opens. */
  url: string;
  /** Local date the props describe. Defaults to now. */
  now?: dayjs.Dayjs;
}

/** Average rating per local day, for every day with an entry. */
export const getRatingsByDate = (items: LogItem[]) => {
  const byDate = new Map<string, LogItem[]>();
  for (const item of items) {
    const date = getItemDate(item);
    const dayItems = byDate.get(date);
    if (dayItems === undefined) {
      byDate.set(date, [item]);
    } else {
      dayItems.push(item);
    }
  }
  const ratings = new Map<string, WidgetRating>();
  for (const [date, dayItems] of byDate) {
    const rating = getAverageMood(dayItems);
    if (rating !== null) {
      ratings.set(date, rating);
    }
  }
  return ratings;
};

const getSchemeColors = (
  theme: "light" | "dark",
  scaleType: string
): WidgetSchemeColors => {
  const colors = Colors[theme];
  const scale = scales[theme][scaleType] ?? scales[theme]["ColorBrew-RdYlGn"];
  // SAFETY: RATING_KEYS lists every WidgetRating exactly once.
  const ratings = Object.fromEntries(
    RATING_KEYS.map((rating) => [rating, scale[rating].background])
  ) as Record<WidgetRating, string>;
  return {
    background: colors.widgetBackground,
    text: colors.widgetText,
    textSecondary: colors.widgetTextSecondary,
    empty: scale.empty.background,
    future: colors.widgetFutureDay,
    ratings,
  };
};

const makeCell = (
  date: dayjs.Dayjs,
  today: dayjs.Dayjs,
  ratings: Map<string, WidgetRating>
): WidgetCell => {
  const key = date.format(DATE_FORMAT);
  return {
    day: date.date(),
    rating: ratings.get(key) ?? "",
    isToday: date.isSame(today, "day"),
    isFuture: date.isAfter(today, "day"),
  };
};

const countLogged = (cells: WidgetCell[]) => {
  let logged = 0;
  let elapsed = 0;
  for (const cell of cells) {
    if (cell.day === 0 || cell.isFuture) {
      continue;
    }
    elapsed += 1;
    if (cell.rating !== "") {
      logged += 1;
    }
  }
  return `${logged}/${elapsed}`;
};

const getBaseProps = (
  input: WidgetDataInput,
  title: string,
  cells: WidgetCell[]
): WidgetBaseProps => ({
  url: input.url,
  title,
  subtitle: countLogged(cells),
  light: getSchemeColors("light", input.scaleType),
  dark: getSchemeColors("dark", input.scaleType),
});

/** Props for the week widget: the current locale week. */
export const getWeekWidgetProps = (input: WidgetDataInput): WeekWidgetProps => {
  const today = (input.now ?? dayjs()).startOf("day");
  const ratings = getRatingsByDate(input.items);
  const start = today.startOf("week");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = start.add(index, "day");
    return { ...makeCell(date, today, ratings), label: date.format("dd") };
  });
  return { ...getBaseProps(input, t("widget_week_title"), days), days };
};

/** Props for the month widget: the current month as calendar rows. */
export const getMonthWidgetProps = (
  input: WidgetDataInput
): MonthWidgetProps => {
  const today = (input.now ?? dayjs()).startOf("day");
  const ratings = getRatingsByDate(input.items);
  const monthStart = today.startOf("month");
  const gridStart = monthStart.startOf("week");
  const daysInMonth = today.daysInMonth();
  const weeks: WidgetCell[][] = [];
  let cursor = gridStart;
  while (cursor.isBefore(monthStart.add(daysInMonth, "day"))) {
    const week: WidgetCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push(
        cursor.isSame(today, "month")
          ? makeCell(cursor, today, ratings)
          : PAD_CELL
      );
      cursor = cursor.add(1, "day");
    }
    weeks.push(week);
  }
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    gridStart.add(index, "day").format("dd")
  );
  return {
    ...getBaseProps(input, today.format("MMMM"), weeks.flat()),
    weekdays,
    weeks,
  };
};

/** Props for the year widget: twelve rows of up to 31 day codes. */
export const getYearWidgetProps = (input: WidgetDataInput): YearWidgetProps => {
  const today = (input.now ?? dayjs()).startOf("day");
  const ratings = getRatingsByDate(input.items);
  const cells: WidgetCell[] = [];
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = today.month(monthIndex).startOf("month");
    const daysInMonth = monthStart.daysInMonth();
    return Array.from({ length: 31 }, (__, dayIndex): YearDayCode => {
      if (dayIndex >= daysInMonth) {
        return "p";
      }
      const cell = makeCell(monthStart.add(dayIndex, "day"), today, ratings);
      cells.push(cell);
      if (cell.rating !== "") {
        return cell.rating;
      }
      return cell.isFuture ? "f" : "";
    });
  });
  const monthLabels = months.map((_, monthIndex) =>
    today.month(monthIndex).format("MMM")
  );
  return {
    ...getBaseProps(input, today.format("YYYY"), cells),
    monthLabels,
    months,
    today: { month: today.month(), day: today.date() },
  };
};

/**
 * Timeline entries for the next `WIDGET_TIMELINE_DAYS` days. The first entry
 * applies now; each later one applies at local midnight so the today marker
 * and the week range move without the app running.
 */
export const getWidgetTimeline = <T extends object>(
  input: WidgetDataInput,
  build: (input: WidgetDataInput) => T,
  days = WIDGET_TIMELINE_DAYS
) => {
  const now = input.now ?? dayjs();
  return Array.from({ length: days }, (_, index) => {
    const date = index === 0 ? now : now.add(index, "day").startOf("day");
    return { date: date.toDate(), props: build({ ...input, now: date }) };
  });
};
