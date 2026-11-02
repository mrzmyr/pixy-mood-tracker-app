import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";

/**
 * Energy × pleasantness field of the mood meter (How We Feel, Yale RULER).
 * `high_pleasant` is top right, `low_unpleasant` bottom left.
 */
export type EmotionQuadrant =
  | "high_unpleasant"
  | "high_pleasant"
  | "low_unpleasant"
  | "low_pleasant";

/** Grid order: top row high energy, left column unpleasant. */
export const EMOTION_QUADRANTS: EmotionQuadrant[] = [
  "high_unpleasant",
  "high_pleasant",
  "low_unpleasant",
  "low_pleasant",
];

const HIGH_PLEASANT = [
  "brave",
  "desire",
  "energized",
  "enthusiastic",
  "excited",
  "focused",
  "happy",
  "hopeful",
  "hyper",
  "impassioned",
  "inspired",
  "motivated",
  "optimistic",
  "productive",
  "proud",
  "surprised",
];

const LOW_PLEASANT = [
  "accepted",
  "appreciated",
  "balanced",
  "calm",
  "comfortable",
  "compassionate",
  "connected",
  "content",
  "good",
  "grateful",
  "heard",
  "loved",
  "relieved",
  "satisfied",
  "supported",
  "thankful",
];

const HIGH_UNPLEASANT = [
  "angry",
  "annoyed",
  "anxious",
  "awkward",
  "concerned",
  "confused",
  "distracted",
  "embarrassed",
  "fearful",
  "fomo",
  "frustrated",
  "impatient",
  "irritated",
  "nervous",
  "overwhelmed",
  "pressured",
  "restless",
  "stressed",
  "uneasy",
  "worried",
];

/**
 * Quadrant per emotion key. Every enabled emotion needs one, or the matrix
 * cannot show it. Keys not listed fall in `low_unpleasant`.
 */
const QUADRANT_BY_KEY = new Map<string, EmotionQuadrant>([
  ...HIGH_PLEASANT.map((key) => [key, "high_pleasant"] as const),
  ...LOW_PLEASANT.map((key) => [key, "low_pleasant"] as const),
  ...HIGH_UNPLEASANT.map((key) => [key, "high_unpleasant"] as const),
]);

/** Keys with an explicit quadrant. Lets a test find unmapped emotions. */
export const MAPPED_EMOTION_KEYS: ReadonlySet<string> = new Set([
  ...QUADRANT_BY_KEY.keys(),
  // Low energy and unpleasant: the fallback, listed so the check sees them.
  "alienated",
  "ashamed",
  "bored",
  "depressed",
  "disappointed",
  "exhausted",
  "fragile",
  "grieved",
  "guilty",
  "hopeless",
  "insecure",
  "lonely",
  "meh",
  "pessimistic",
  "rejected",
  "sad",
  "tired",
  "unmotivated",
  "vulnerable",
  "weak",
]);

/** Quadrant of one emotion. */
export const getEmotionQuadrant = (key: Emotion["key"]): EmotionQuadrant =>
  QUADRANT_BY_KEY.get(key) ?? "low_unpleasant";

const DEFAULT_QUADRANT: Record<LogItem["rating"], EmotionQuadrant> = {
  extremely_good: "high_pleasant",
  very_good: "high_pleasant",
  good: "high_pleasant",
  neutral: "low_pleasant",
  bad: "high_unpleasant",
  very_bad: "low_unpleasant",
  extremely_bad: "low_unpleasant",
};

/**
 * Quadrant the matrix opens on. The mood sets the pleasant side and guesses
 * energy: good moods open high energy, neutral and the worst moods low
 * energy. No mood: high energy, pleasant.
 */
export const getDefaultQuadrant = (
  rating: LogItem["rating"] | null
): EmotionQuadrant =>
  rating === null ? "high_pleasant" : DEFAULT_QUADRANT[rating];

/** Label of one quadrant, also the section title in the full list. */
export const getQuadrantLabel = (quadrant: EmotionQuadrant): string =>
  ({
    high_unpleasant: t("quick_check_in_quadrant_high_unpleasant"),
    high_pleasant: t("quick_check_in_quadrant_high_pleasant"),
    low_unpleasant: t("quick_check_in_quadrant_low_unpleasant"),
    low_pleasant: t("quick_check_in_quadrant_low_pleasant"),
  })[quadrant];
