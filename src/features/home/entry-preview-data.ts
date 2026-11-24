import keyBy from "lodash/keyBy";
import sortBy from "lodash/sortBy";
import { getLocationLabel } from "@/features/location";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";
import { getPhotoFile } from "@/features/photos";
import type { Tag } from "@/features/tags";
import { getItemDate } from "@/lib/log-dates";
import { formatItemTime } from "@/lib/utils";
import type { EntryPreviewData } from "./components/entry-preview";

const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");
// Positive first, like the emotions on the day view.
const CATEGORY_ORDER = {
  very_positive: 0,
  positive: 1,
  neutral: 2,
  negative: 3,
  very_negative: 4,
};

/**
 * Display data of one entry for Home. Skips unknown emotions, deleted people
 * and tags, and the place when location is off.
 */
export const getEntryPreview = (
  item: LogItem,
  {
    people,
    tags,
    showPlace,
  }: { people: Person[]; tags: Tag[]; showPlace: boolean }
): EntryPreviewData => ({
  id: item.id,
  date: getItemDate(item),
  time: formatItemTime(item.dateTime),
  rating: item.rating,
  emotions: sortBy(
    item.emotions.flatMap((key) =>
      EMOTIONS_BY_KEY[key] ? [EMOTIONS_BY_KEY[key]] : []
    ),
    (emotion) => CATEGORY_ORDER[emotion.category]
  ),
  note: item.message.trim(),
  people: item.people.flatMap(({ id }) => {
    const person = people.find((candidate) => candidate.id === id);
    return person ? [person] : [];
  }),
  tags: item.tags.flatMap(({ id }) => {
    const tag = tags.find((candidate) => candidate.id === id);
    return tag ? [tag] : [];
  }),
  place: showPlace && item.location ? getLocationLabel(item.location) : null,
  photoUris: item.photos.slice(0, 3).map((photo) => getPhotoFile(photo).uri),
});
