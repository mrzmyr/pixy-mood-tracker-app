import dayjs from "dayjs";
import Colors from "@/constants/Colors";
import scales from "@/constants/Colors/Scales";
import { RATING_KEYS, RATING_MAPPING } from "@/constants/Ratings";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";
import { t } from "@/lib/translation";
import { PAD_CELL } from "./widgetProps";
import type {
  CheckInTap,
  CheckInWidgetProps,
  MonthWidgetProps,
  YearGrid,
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

/** Rows in the week widget: the current week and the three before it. */
export const WEEK_WIDGET_WEEKS = 4;

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
  /** Feature flag state; widgets show "Not available" when `false`. Defaults to `true`. */
  isAvailable?: boolean;
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

/** Colors for one scheme; also used by the year image renderer. */
export const getSchemeColors = (
  theme: "light" | "dark",
  scaleType: string
): WidgetSchemeColors => {
  const colors = Colors[theme];
  const scale = scales[theme][scaleType] ?? scales[theme]["ColorBrew-RdYlGn"];
  // SAFETY: RATING_KEYS lists every WidgetRating exactly once.
  const ratings = Object.fromEntries(
    RATING_KEYS.map((rating) => [rating, scale[rating].background])
  ) as Record<WidgetRating, string>;
  // SAFETY: RATING_KEYS lists every WidgetRating exactly once.
  const ratingTexts = Object.fromEntries(
    RATING_KEYS.map((rating) => [rating, scale[rating].text])
  ) as Record<WidgetRating, string>;
  return {
    background: colors.widgetBackground,
    text: colors.widgetText,
    textSecondary: colors.widgetTextSecondary,
    // The calendar's empty background is nearly the widget background, so
    // past empty days use the dotted-border color and future days the lighter one.
    empty: scale.empty.border,
    future: scale.empty.background,
    today: colors.tint,
    ratings,
    ratingTexts,
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
  isAvailable: input.isAvailable ?? true,
  unavailableText: t("widget_not_available"),
  url: input.url,
  title,
  subtitle: countLogged(cells),
  light: getSchemeColors("light", input.scaleType),
  dark: getSchemeColors("dark", input.scaleType),
});

/**
 * Props for the week widget: the current locale week as the last row, with
 * the three weeks before it. The subtitle counts all four weeks.
 */
export const getWeekWidgetProps = (input: WidgetDataInput): WeekWidgetProps => {
  const today = (input.now ?? dayjs()).startOf("day");
  const ratings = getRatingsByDate(input.items);
  const start = today.startOf("week").subtract(WEEK_WIDGET_WEEKS - 1, "week");
  const weeks = Array.from({ length: WEEK_WIDGET_WEEKS }, (_, weekIndex) =>
    Array.from({ length: 7 }, (__, dayIndex) =>
      makeCell(start.add(weekIndex * 7 + dayIndex, "day"), today, ratings)
    )
  );
  return {
    ...getBaseProps(input, t("widget_week_title"), weeks.flat()),
    weeks,
  };
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
  return {
    ...getBaseProps(input, today.format("MMMM"), weeks.flat()),
    weeks,
  };
};

/** Week columns in the year grid: 53 covers every year and week start. */
export const YEAR_GRID_COLUMNS = 53;

/** Day codes for the year grid image, one column per week. */
export const getYearGrid = (input: WidgetDataInput): YearGrid => {
  const today = (input.now ?? dayjs()).startOf("day");
  const ratings = getRatingsByDate(input.items);
  const yearStart = today.startOf("year");
  const yearEnd = today.endOf("year");
  const gridStart = yearStart.startOf("week");
  const cells: WidgetCell[] = [];
  let todayPosition = { column: 0, row: 0 };
  const columns = Array.from({ length: YEAR_GRID_COLUMNS }, (_, column) =>
    Array.from({ length: 7 }, (__, row): YearDayCode => {
      const date = gridStart.add(column * 7 + row, "day");
      if (date.isBefore(yearStart) || date.isAfter(yearEnd)) {
        return "p";
      }
      const cell = makeCell(date, today, ratings);
      cells.push(cell);
      if (cell.isToday) {
        todayPosition = { column, row };
      }
      if (cell.rating !== "") {
        return cell.rating;
      }
      return cell.isFuture ? "f" : "";
    })
  );
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = today.month(monthIndex).startOf("month");
    const daysInMonth = monthStart.daysInMonth();
    const firstRow = monthStart.startOf("week");
    const weeks: YearDayCode[][] = [];
    let todayDay = 0;
    let cursor = firstRow;
    while (cursor.isBefore(monthStart.add(daysInMonth, "day"))) {
      const week: YearDayCode[] = [];
      for (let index = 0; index < 7; index += 1) {
        if (cursor.isSame(monthStart, "month")) {
          const cell = makeCell(cursor, today, ratings);
          if (cell.isToday) {
            todayDay = cell.day;
          }
          if (cell.rating === "") {
            week.push(cell.isFuture ? "f" : "");
          } else {
            week.push(cell.rating);
          }
        } else {
          week.push("p");
        }
        cursor = cursor.add(1, "day");
      }
      weeks.push(week);
    }
    return { label: monthStart.format("MMM"), weeks, today: todayDay };
  });
  return { columns, today: todayPosition, cells, months };
};

/** `file://` URIs of the captured year row images per color scheme and size. */
export interface YearImages {
  light: string[];
  dark: string[];
  lightLarge: string[];
  darkLarge: string[];
  version: number;
}

/** Props for the year widget: title, subtitle, and the captured images. */
export const getYearWidgetProps = (
  input: WidgetDataInput,
  images?: YearImages
): YearWidgetProps => {
  const today = (input.now ?? dayjs()).startOf("day");
  const { cells } = getYearGrid(input);
  return {
    ...getBaseProps(input, today.format("YYYY"), cells),
    rowsLight: images?.light ?? [],
    rowsDark: images?.dark ?? [],
    rowsLightLarge: images?.lightLarge ?? [],
    rowsDarkLarge: images?.darkLarge ?? [],
    imageVersion: images?.version ?? 0,
  };
};

/**
 * Props for the check-in widget. `taps` are taps the app has not imported
 * yet; they stay so a tap between read and write survives the next sync.
 */
export const getCheckInWidgetProps = (
  input: WidgetDataInput & {
    /** `HH:mm`, or `null` when reminders are off. */
    reminderTime: string | null;
    taps: CheckInTap[];
  }
): CheckInWidgetProps => {
  const today = (input.now ?? dayjs()).format(DATE_FORMAT);
  let latest: LogItem | null = null;
  for (const item of input.items) {
    if (
      getItemDate(item) === today &&
      (latest === null || item.dateTime > latest.dateTime)
    ) {
      latest = item;
    }
  }
  const todayTaps = input.taps.filter(
    (tap) => dayjs(tap.at).format(DATE_FORMAT) === today
  );
  const lastTap = todayTaps.at(-1);
  return {
    ...getBaseProps(input, t("widget_check_in_title"), []),
    subtitle: "",
    selected: lastTap?.rating ?? latest?.rating ?? "",
    taps: input.taps,
    reminderTime:
      input.reminderTime === null
        ? ""
        : dayjs(`2000-01-01T${input.reminderTime}`).format("LT"),
    // Numbers, not rating words: the widget never names a mood as bad.
    // SAFETY: RATING_KEYS lists every WidgetRating exactly once.
    ratingLabels: Object.fromEntries(
      RATING_KEYS.map((rating) => [
        rating,
        t("widget_check_in_rating_label", {
          value: RATING_MAPPING[rating] + 1,
          total: RATING_KEYS.length,
        }),
      ])
    ) as Record<WidgetRating, string>,
    savedAt: 0,
    savedText: t("widget_check_in_saved"),
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
