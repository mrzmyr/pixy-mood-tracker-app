import type { LogItem } from "@/features/logs";
import type { SavedEntryProperties } from "@/state/analytics/events";

/**
 * Count whitespace-separated words.
 *
 * Chinese, Japanese, and Thai do not separate words with spaces, so a note
 * in these languages counts as 1 word per space-free run.
 */
export const countWords = (text: string) => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return 0;
  }

  return trimmed.split(/\s+/u).length;
};

/** Analytics metadata for a saved entry. Free text is sent as counts only. */
export const getEntryProperties = ({
  item,
  entriesCount,
}: {
  item: LogItem;
  entriesCount: number;
}): SavedEntryProperties => ({
  rating: item.rating,
  emotions: item.emotions,
  emotions_count: item.emotions.length,
  tags_count: item.tags.length,
  people_count: item.people.length,
  message_length: item.message.length,
  message_word_count: countWords(item.message),
  sleep_quality: item.sleep?.quality ?? null,
  entries_count: entriesCount,
});
