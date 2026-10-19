import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { toLogDate } from "@/lib/log-dates";
import type { Emotion } from "@/types";
import { rankEmotions, rankInfluences } from "./ranking";
import type { InfluenceOption } from "./ranking";

/**
 * Ranked slots kept per step. Glance surfaces show as many as fit; More
 * opens the full list.
 */
export const GLANCE_SLOTS = 9;

/**
 * Check-in on a glance surface (Live Activity, notification).
 *
 * - `entryId` is `""` until the mood tap saves the entry.
 * - Slots are ranked once per step and never re-sorted between taps.
 * - Empty values are `""` or `[]`, never `null`: native storage drops `null`.
 */
export interface CheckInState {
  step: "mood" | "emotion" | "people" | "tags" | "done";
  entryId: string;
  rating: LogItem["rating"] | "";
  emotionSlots: Emotion["key"][];
  emotion: Emotion["key"] | "";
  peopleSlots: InfluenceOption[];
  tagSlots: InfluenceOption[];
  /** Picked slots as `kind:id`. */
  picked: string[];
}

/** Before the first tap and after Restart. */
export const INITIAL_CHECK_IN_STATE: CheckInState = {
  step: "mood",
  entryId: "",
  rating: "",
  emotionSlots: [],
  emotion: "",
  peopleSlots: [],
  tagSlots: [],
  picked: [],
};

/** Data a tap reads. `newId` names the entry a mood tap creates. */
export interface CheckInContext {
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; color?: string; isArchived?: boolean }[];
  emotions: Pick<Emotion, "key" | "category" | "mode" | "disabled">[];
  now: dayjs.Dayjs;
  newId: string;
}

/** Store change a tap asks for. */
export type EntryChange =
  | { type: "add"; item: LogItem }
  | { type: "edit"; item: Pick<LogItem, "id"> & Partial<LogItem> }
  | null;

/** Next state plus the store change; `change` is `null` for ignored taps. */
export interface TapResult {
  state: CheckInState;
  change: EntryChange;
}

const RATINGS: LogItem["rating"][] = [
  "extremely_good",
  "very_good",
  "good",
  "neutral",
  "bad",
  "very_bad",
  "extremely_bad",
];

/** Sleep before the user rates it. Stored as is when skipped. */
interface SleepDraft {
  quality: LogItem["sleep"]["quality"] | null;
}

const SKIPPED_SLEEP: SleepDraft = { quality: null };

/**
 * New entry at `now` with no note, photos, or sleep. Glance surfaces and the
 * quick check-in screen create entries only through here.
 */
export const createQuickEntry = (
  id: string,
  now: dayjs.Dayjs,
  fields: Pick<LogItem, "rating"> &
    Partial<Pick<LogItem, "emotions" | "people" | "tags">>
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

const isRating = (value: string): value is LogItem["rating"] =>
  RATINGS.some((rating) => rating === value);

/** Button target for one slot or action. Parsed by {@link tapCheckIn}. */
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

const unchanged = (state: CheckInState): TapResult => ({
  state,
  change: null,
});

const toPeople = (
  state: CheckInState,
  emotion: Emotion["key"] | "",
  context: CheckInContext
): TapResult => {
  const ranked =
    state.rating === ""
      ? []
      : rankInfluences({
          items: context.items,
          people: context.people,
          tags: context.tags,
          rating: state.rating,
          now: context.now,
        });
  const peopleSlots = ranked
    .filter((option) => option.kind === "person")
    .slice(0, GLANCE_SLOTS);
  const tagSlots = ranked
    .filter((option) => option.kind === "tag")
    .slice(0, GLANCE_SLOTS);
  // No people or no tags: skip that step instead of showing an empty row.
  let step: CheckInState["step"] = "done";
  if (tagSlots.length > 0) {
    step = "tags";
  }
  if (peopleSlots.length > 0) {
    step = "people";
  }
  return {
    state: { ...state, step, emotion, peopleSlots, tagSlots },
    change: {
      type: "edit",
      item: { id: state.entryId, emotions: emotion ? [emotion] : [] },
    },
  };
};

const togglePick = (
  state: CheckInState,
  slot: InfluenceOption,
  context: CheckInContext
): TapResult => {
  const key = `${slot.kind}:${slot.id}`;
  const picked = state.picked.includes(key)
    ? state.picked.filter((value) => value !== key)
    : [...state.picked, key];
  const entry = context.items.find((item) => item.id === state.entryId);
  const field = slot.kind === "person" ? "people" : "tags";
  const current = entry?.[field] ?? [];
  const references = picked.includes(key)
    ? [
        ...current.filter((reference) => reference.id !== slot.id),
        { id: slot.id },
      ]
    : current.filter((reference) => reference.id !== slot.id);
  return {
    state: { ...state, picked },
    change: {
      type: "edit",
      item: { id: state.entryId, [field]: references },
    },
  };
};

/**
 * Apply one tap. Pure: returns the next state and the store change.
 *
 * - Mood saves a new entry right away (mood-only entries are valid). Later
 *   taps edit the same entry, so the user loses nothing by stopping early.
 * - Unknown targets, stale slots, and ids no longer offered do nothing.
 * - An entry deleted in the app meanwhile restarts the check-in.
 */
export const tapCheckIn = (
  state: CheckInState,
  target: string,
  context: CheckInContext
): TapResult => {
  if (target === checkInTarget.restart) {
    return unchanged(INITIAL_CHECK_IN_STATE);
  }

  if (state.step === "mood") {
    const rating = target.startsWith("mood:") ? target.slice(5) : "";
    if (!isRating(rating)) {
      return unchanged(state);
    }
    const item = createQuickEntry(context.newId, context.now, { rating });
    return {
      state: {
        ...INITIAL_CHECK_IN_STATE,
        step: "emotion",
        entryId: item.id,
        rating,
        emotionSlots: rankEmotions({
          items: context.items,
          emotions: context.emotions,
          rating,
          now: context.now,
        }).slice(0, GLANCE_SLOTS),
      },
      change: { type: "add", item },
    };
  }

  if (!context.items.some((item) => item.id === state.entryId)) {
    return unchanged(INITIAL_CHECK_IN_STATE);
  }

  if (state.step === "emotion") {
    if (target === checkInTarget.skipEmotion) {
      return toPeople(state, "", context);
    }
    const key = target.startsWith("emotion:") ? target.slice(8) : "";
    if (!state.emotionSlots.includes(key)) {
      return unchanged(state);
    }
    return toPeople(state, key, context);
  }

  if (state.step === "people" || state.step === "tags") {
    const isPeople = state.step === "people";
    if (target === checkInTarget.next && isPeople) {
      return unchanged({
        ...state,
        step: state.tagSlots.length > 0 ? "tags" : "done",
      });
    }
    if (target === checkInTarget.finish) {
      return unchanged({ ...state, step: "done" });
    }
    const slots = isPeople ? state.peopleSlots : state.tagSlots;
    const slot = slots.find(
      (option) => checkInTarget.influence(option) === target
    );
    if (!slot) {
      return unchanged(state);
    }
    return togglePick(state, slot, context);
  }

  return unchanged(state);
};
