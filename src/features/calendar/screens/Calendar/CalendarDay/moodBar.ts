import type { LogItem } from "@/features/logs";
import { getItemTime } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";

type MoodBarSegment = Pick<LogItem, "id" | "rating">;

/** One bar segment per entry of a day, earliest entry first. */
export const getMoodBarSegments = (items: LogItem[]): MoodBarSegment[] =>
  [...items]
    .sort((a, b) => getItemTime(a) - getItemTime(b))
    .map(({ id, rating }) => ({ id, rating }));

/** One bar segment in the day's average mood; none for a day without entries. */
export const getAverageMoodBarSegments = (
  dateString: string,
  items: LogItem[]
): MoodBarSegment[] => {
  const rating = getAverageMood(items);
  return rating === null ? [] : [{ id: `average-${dateString}`, rating }];
};
