import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import type { TemporaryLogState } from "./temporaryLog";
import { EMOTIONS } from "./config";

const ADVANCED_EMOTION_KEYS = new Set<string>();
for (const emotion of EMOTIONS) {
  if (emotion.mode === "advanced") {
    ADVANCED_EMOTION_KEYS.add(emotion.key);
  }
}

/**
 * Entry context for `logger:log_saved`: counts and day offsets only.
 *
 * `items` is the stored state before this save. An edited entry is counted
 * once, on its new date.
 */
export const getSavedEntryProperties = ({
  data,
  items,
  now,
}: {
  data: Pick<TemporaryLogState, "id" | "dateTime" | "emotions">;
  items: LogItem[];
  now: Date;
}) => {
  const entryDate = dayjs(data.dateTime).format(DATE_FORMAT);
  const otherItemsOnDate = items.filter(
    (item) => item.id !== data.id && getItemDate(item) === entryDate
  );

  return {
    advanced_emotions_count: data.emotions.filter((key) =>
      ADVANCED_EMOTION_KEYS.has(key)
    ).length,
    entry_days_ago: dayjs(now).startOf("day").diff(dayjs(entryDate), "day"),
    entries_on_date: otherItemsOnDate.length + 1,
  };
};
