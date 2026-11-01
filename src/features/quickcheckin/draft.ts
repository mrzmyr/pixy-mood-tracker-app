import { MAX_MESSAGE_LENGTH } from "@/constants/config";
import type { LoggerPrefill } from "@/features/logger";
import type { LogItem } from "@/features/logs";

/** Quick check-in screen values. `source` tells whether the user changed them yet. */
export interface Draft {
  rating: LogItem["rating"] | null;
  emotions: string[];
  /** Picked people and tags as `kind:id`. */
  picked: string[];
  message: string;
  photos: LogItem["photos"];
  source: "empty" | "entry" | "user";
}

/** Draft from a saved entry, or an empty one when `entry` is missing. */
export const toDraft = (entry: LogItem | undefined): Draft =>
  entry
    ? {
        rating: entry.rating,
        emotions: entry.emotions,
        picked: [
          ...entry.people.map((person) => `person:${person.id}`),
          ...entry.tags.map((tag) => `tag:${tag.id}`),
        ],
        message: entry.message,
        photos: entry.photos,
        source: "entry",
      }
    : {
        rating: null,
        emotions: [],
        picked: [],
        message: "",
        photos: [],
        source: "empty",
      };

const sameItems = (current: string[], initial: string[]) => {
  const initialSet = new Set(initial);
  return (
    current.length === initialSet.size &&
    current.every((value) => initialSet.has(value))
  );
};

/**
 * Whether the user changed the draft from what the screen opened with: the
 * saved `entry`, or an empty draft. Picking a chip and unpicking it again is
 * no change.
 */
export const hasDraftChanges = (draft: Draft, entry?: LogItem): boolean => {
  if (draft.source !== "user") {
    return false;
  }
  const initial = toDraft(entry);
  return (
    draft.rating !== initial.rating ||
    draft.message !== initial.message ||
    !sameItems(draft.emotions, initial.emotions) ||
    !sameItems(draft.picked, initial.picked) ||
    !sameItems(
      draft.photos.map((photo) => photo.id),
      initial.photos.map((photo) => photo.id)
    )
  );
};

const union = (current: string[], added: string[]) => [
  ...new Set([...current, ...added]),
];

/**
 * Add what the user said in voice mode to the draft.
 *
 * - Emotions, people, and tags add to the picked ones. Nothing is removed.
 * - A spoken mood replaces the rating. No spoken mood keeps it.
 * - The transcript goes on a new line after the note.
 */
export const applyVoicePrefill = (
  draft: Draft,
  prefill: LoggerPrefill
): Draft => {
  const note = prefill.message.trim();
  const message =
    note === "" || draft.message.trim() === ""
      ? draft.message || note
      : `${draft.message}\n${note}`;
  return {
    rating: prefill.rating ?? draft.rating,
    emotions: union(draft.emotions, prefill.emotions),
    picked: union(draft.picked, [
      ...prefill.people.map((id) => `person:${id}`),
      ...prefill.tags.map((id) => `tag:${id}`),
    ]),
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    photos: draft.photos,
    source: "user",
  };
};
