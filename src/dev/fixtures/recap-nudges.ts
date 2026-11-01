import { TAG_COLOR_NAMES } from "@/constants/config";
import type { ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

// Newest fixture day; `endsToday` shifts it to today.
const NEWEST_DAY = "2026-09-30";
const CHECK_IN_DAYS = 3;
const TAGS_COUNT = 34;

const tags: Tag[] = Array.from({ length: TAGS_COUNT }, (_, index) => ({
  id: `recap-tag-${index}`,
  title: `Tag ${index + 1}`,
  color: TAG_COLOR_NAMES[index % TAG_COLOR_NAMES.length],
}));

const items: LogItem[] = Array.from({ length: CHECK_IN_DAYS }, (_, index) => {
  const date = new Date(`${NEWEST_DAY}T18:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - index);
  const iso = date.toISOString();
  return {
    id: `recap-entry-${index}`,
    date: iso.slice(0, 10),
    dateTime: iso,
    createdAt: iso,
    rating: "good",
    message: "",
    sleep: { quality: "good" },
    tags: [{ id: tags[index].id }],
    people: [],
    emotions: [],
    photos: [],
  };
});

/**
 * Data that shows every recap nudge in the week recap: 3 check-in days,
 * reminder off, Emotions, People, and Photos steps off, and 34 tags in
 * General. People and Photos nudges also need their flags on.
 */
export const withRecapNudges = (data: ImportData): ImportData => ({
  ...data,
  items,
  tags,
  settings: {
    ...data.settings,
    reminderEnabled: false,
    steps: ["rating", "tags", "sleep", "message"],
  },
});
