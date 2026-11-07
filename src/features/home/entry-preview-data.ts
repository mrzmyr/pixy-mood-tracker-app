import type { LogItem } from "@/features/logs";
import { getLocationLabel } from "@/features/location";
import type { Person } from "@/features/people";
import { getAvatarUri, getInitials } from "@/features/people";
import { getPhotoFile } from "@/features/photos";
import type { Tag } from "@/features/tags";
import { getItemDate } from "@/lib/log-dates";
import { tDynamic } from "@/lib/translation";
import { formatItemTime } from "@/lib/utils";
import type { EntryPreviewData } from "./components/entry-preview";

/**
 * Display data of one entry for Home. Skips deleted people and tags, and
 * the place when location is off.
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
  emotions: item.emotions.map((key) => tDynamic(`log_emotion_${key}`)),
  note: item.message.trim(),
  people: item.people.flatMap(({ id }) => {
    const person = people.find((candidate) => candidate.id === id);
    return person
      ? [
          {
            id: person.id,
            name: person.name,
            avatarUri: person.avatar ? getAvatarUri(person.avatar) : null,
            initials: getInitials(person.name),
          },
        ]
      : [];
  }),
  tags: item.tags.flatMap(({ id }) => {
    const tag = tags.find((candidate) => candidate.id === id);
    return tag ? [{ id: tag.id, title: tag.title }] : [];
  }),
  place: showPlace && item.location ? getLocationLabel(item.location) : null,
  photoUris: item.photos.slice(0, 3).map((photo) => getPhotoFile(photo).uri),
});
