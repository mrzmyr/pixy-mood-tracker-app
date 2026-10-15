import dayjs from "dayjs";
import { getItemDate } from "@/lib/logDates";
import type { LogItem } from "@/features/logs";
import { countPhotosBySource } from "@/features/photos";
import type { AnalyticsEvents } from "@/state/analytics/events";

import type { LoggerMode } from "./Logger";

/**
 * Properties of `logger:log_saved`. Fixed mood values go as they are; free
 * text (note, tag and people names) only as counts and lengths.
 */
export const getLogSavedProperties = ({
  mode,
  item,
  hasRating,
  durationMs,
  now,
}: {
  mode: LoggerMode;
  item: LogItem;
  hasRating: boolean;
  durationMs: number;
  now: Date;
}): AnalyticsEvents["logger:log_saved"] => {
  const photoCounts = countPhotosBySource({ photos: item.photos });

  return {
    mode,
    duration_ms: durationMs,
    has_rating: hasRating,
    rating: hasRating ? item.rating : null,
    emotions: item.emotions,
    sleep_quality: item.sleep?.quality ?? null,
    entry_days_ago: dayjs(now)
      .startOf("day")
      .diff(dayjs(getItemDate(item)), "day"),
    message_length: item.message.length,
    tags_count: item.tags.length,
    people_count: item.people.length,
    emotions_count: item.emotions.length,
    photos_count: item.photos.length,
    photos_day_count: photoCounts.day,
    photos_library_count: photoCounts.library,
    has_location: item.location !== undefined,
  };
};
