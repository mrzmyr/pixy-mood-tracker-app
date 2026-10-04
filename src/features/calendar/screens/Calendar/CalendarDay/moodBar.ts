import type { LogItem } from "@/features/logs";
import { getItemTime } from "@/lib/logDates";

/** One bar segment per entry of a day, earliest entry first. */
export const getMoodBarSegments = (
  items: LogItem[]
): Pick<LogItem, "id" | "rating">[] =>
  [...items]
    .sort((a, b) => getItemTime(a) - getItemTime(b))
    .map(({ id, rating }) => ({ id, rating }));
