import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { toLogDate } from "@/lib/log-dates";
import type { InfluenceOption } from "./ranking";

/**
 * Ranked slots kept per step. The notification shows as many as fit; More
 * opens the full list.
 */
export const GLANCE_SLOTS = 9;

/** Store change a tap asks for. */
export type EntryChange =
  | { type: "add"; item: LogItem }
  | { type: "edit"; item: Pick<LogItem, "id"> & Partial<LogItem> }
  | null;

/** Sleep before the user rates it. Stored as is when skipped. */
interface SleepDraft {
  quality: LogItem["sleep"]["quality"] | null;
}

const SKIPPED_SLEEP: SleepDraft = { quality: null };

/**
 * New entry at `now` with no photos or sleep. The notification and the
 * quick check-in screen create entries only through here.
 */
export const createQuickEntry = (
  id: string,
  now: dayjs.Dayjs,
  fields: Pick<LogItem, "rating"> &
    Partial<Pick<LogItem, "emotions" | "people" | "tags" | "message">>
): LogItem => {
  const dateTime = now.toISOString();
  return {
    id,
    date: toLogDate(dateTime),
    dateTime,
    createdAt: dateTime,
    message: "",
    emotions: [],
    tags: [],
    people: [],
    photos: [],
    // SAFETY: a skipped sleep step stores a null quality, same as the logger (see finalizeDraft).
    sleep: SKIPPED_SLEEP as LogItem["sleep"],
    ...fields,
  };
};

/** Button target for one slot or action. Parsed by the Android notification (`notification-plan.ts`). */
export const checkInTarget = {
  mood: (rating: LogItem["rating"]) => `mood:${rating}`,
  emotion: (key: string) => `emotion:${key}`,
  skipEmotion: "emotion_skip",
  influence: (option: Pick<InfluenceOption, "kind" | "id">) =>
    `influence:${option.kind}:${option.id}`,
  /** From people to tags. */
  next: "next",
  finish: "finish",
  restart: "restart",
};
