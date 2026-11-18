import type { TranslationKey } from "@/lib/translation";
import type { Emotion } from "@/types";

/** How well one Need was met, in segment order. */
export const NEED_STATES = ["met", "partly", "unmet"] as const;

/** How well one Need was met. */
export type NeedState = (typeof NEED_STATES)[number];

/**
 * One basic need of the needs check. Self-Determination Theory core
 * (autonomy, competence, connection) plus body, safety, and joy from
 * Glasser, Grawe, and Maslow.
 *
 * `met` and `unmet` list emotion keys, strongest match first.
 */
interface Need {
  key: string;
  label: TranslationKey;
  /** What the need means, short enough for one line. */
  description: TranslationKey;
  met: string[];
  unmet: string[];
}

/** Needs in display order. Every emotion key must exist in `EMOTIONS`. */
export const NEEDS = [
  {
    key: "body",
    label: "log_needs_body",
    description: "log_needs_body_about",
    met: ["energized", "balanced", "comfortable", "good"],
    unmet: ["tired", "exhausted", "weak", "restless", "irritated"],
  },
  {
    key: "safety",
    label: "log_needs_safety",
    description: "log_needs_safety_about",
    met: ["calm", "relieved", "comfortable", "balanced"],
    unmet: ["anxious", "worried", "nervous", "uneasy", "fearful"],
  },
  {
    key: "connection",
    label: "log_needs_connection",
    description: "log_needs_connection_about",
    met: ["connected", "loved", "supported", "accepted", "heard"],
    unmet: ["lonely", "alienated", "rejected", "sad", "vulnerable"],
  },
  {
    key: "autonomy",
    label: "log_needs_autonomy",
    description: "log_needs_autonomy_about",
    met: ["motivated", "brave", "content", "relieved"],
    unmet: ["pressured", "frustrated", "angry", "stressed", "impatient"],
  },
  {
    key: "competence",
    label: "log_needs_competence",
    description: "log_needs_competence_about",
    met: ["proud", "productive", "focused", "satisfied"],
    unmet: ["overwhelmed", "insecure", "disappointed", "frustrated"],
  },
  {
    key: "joy",
    label: "log_needs_joy",
    description: "log_needs_joy_about",
    met: ["happy", "excited", "enthusiastic", "good", "content"],
    unmet: ["bored", "meh", "unmotivated", "fomo", "sad"],
  },
] as const satisfies readonly Need[];

/** Key of one {@link NEEDS} entry. */
export type NeedKey = (typeof NEEDS)[number]["key"];

/** Rated needs. Unrated needs have no key. */
export type NeedStates = Partial<Record<NeedKey, NeedState>>;

/** Feelings shown under one rated need. Fills two rows of the grid. */
const MAX_PER_NEED = 4;

/** How many feelings of each side a partly met need shows. */
const PARTLY_PER_SIDE = MAX_PER_NEED / 2;

/**
 * Emotions shown under one rated need, at most 4, strongest match first.
 *
 * Met shows pleasant emotions, unmet unpleasant ones. Partly met shows two
 * of each. Disabled emotions and keys missing from `emotions` are skipped.
 */
export const suggestEmotionsForNeed = (
  need: Pick<Need, "met" | "unmet">,
  state: NeedState,
  emotions: Emotion[]
): Emotion[] => {
  const byKey = new Map<string, Emotion>();
  for (const emotion of emotions) {
    if (emotion.disabled !== true) {
      byKey.set(emotion.key, emotion);
    }
  }
  const pick = (keys: readonly string[], count: number) =>
    keys.flatMap((key) => byKey.get(key) ?? []).slice(0, count);

  if (state === "met") {
    return pick(need.met, MAX_PER_NEED);
  }
  if (state === "unmet") {
    return pick(need.unmet, MAX_PER_NEED);
  }
  return [
    ...pick(need.met, PARTLY_PER_SIDE),
    ...pick(need.unmet, PARTLY_PER_SIDE),
  ];
};
