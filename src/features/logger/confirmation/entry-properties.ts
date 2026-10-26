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

/**
 * Analytics metadata for a saved entry. Free text and emotions are sent as
 * counts, rating and sleep as booleans: health values stay on the device.
 */
export const getEntryProperties = ({
  item,
  entriesCount,
}: {
  item: LogItem;
  entriesCount: number;
}): SavedEntryProperties => ({
  has_rating: item.rating !== null,
  emotions_count: item.emotions.length,
  tags_count: item.tags.length,
  people_count: item.people.length,
  message_length: item.message.length,
  message_word_count: countWords(item.message),
  has_sleep: (item.sleep?.quality ?? null) !== null,
  entries_count: entriesCount,
});
