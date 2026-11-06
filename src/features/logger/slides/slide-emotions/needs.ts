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
 * `met` lists pleasant emotion keys, `unmet` unpleasant ones, strongest
 * match first. A rough match is fine: weak matches go last and show only
 * after More.
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
    met: [
      "energized",
      "balanced",
      "comfortable",
      "good",
      "calm",
      "content",
      "focused",
      "productive",
      "relieved",
    ],
    unmet: [
      "tired",
      "exhausted",
      "weak",
      "restless",
      "irritated",
      "distracted",
      "fragile",
      "hyper",
      "unmotivated",
      "stressed",
      "impatient",
      "depressed",
      "meh",
    ],
  },
  {
    key: "safety",
    label: "log_needs_safety",
    description: "log_needs_safety_about",
    met: [
      "calm",
      "relieved",
      "comfortable",
      "balanced",
      "supported",
      "content",
      "hopeful",
      "optimistic",
      "good",
    ],
    unmet: [
      "anxious",
      "worried",
      "nervous",
      "uneasy",
      "fearful",
      "concerned",
      "stressed",
      "insecure",
      "vulnerable",
      "fragile",
      "overwhelmed",
      "pessimistic",
      "hopeless",
      "confused",
      "restless",
    ],
  },
  {
    key: "connection",
    label: "log_needs_connection",
    description: "log_needs_connection_about",
    met: [
      "connected",
      "loved",
      "supported",
      "accepted",
      "heard",
      "appreciated",
      "grateful",
      "thankful",
      "compassionate",
      "happy",
      "content",
    ],
    unmet: [
      "lonely",
      "alienated",
      "rejected",
      "sad",
      "vulnerable",
      "grieved",
      "awkward",
      "fomo",
      "embarrassed",
      "ashamed",
      "guilty",
      "annoyed",
      "angry",
      "depressed",
      "insecure",
    ],
  },
  {
    key: "autonomy",
    label: "log_needs_autonomy",
    description: "log_needs_autonomy_about",
    met: [
      "motivated",
      "brave",
      "content",
      "relieved",
      "inspired",
      "impassioned",
      "optimistic",
      "hopeful",
      "desire",
      "energized",
      "focused",
    ],
    unmet: [
      "pressured",
      "frustrated",
      "angry",
      "stressed",
      "impatient",
      "irritated",
      "annoyed",
      "overwhelmed",
      "hopeless",
      "unmotivated",
      "restless",
      "guilty",
    ],
  },
  {
    key: "competence",
    label: "log_needs_competence",
    description: "log_needs_competence_about",
    met: [
      "proud",
      "productive",
      "focused",
      "satisfied",
      "motivated",
      "brave",
      "appreciated",
      "inspired",
      "relieved",
      "hopeful",
      "optimistic",
    ],
    unmet: [
      "overwhelmed",
      "insecure",
      "disappointed",
      "frustrated",
      "embarrassed",
      "ashamed",
      "confused",
      "distracted",
      "guilty",
      "pessimistic",
      "weak",
      "pressured",
      "stressed",
    ],
  },
  {
    key: "joy",
    label: "log_needs_joy",
    description: "log_needs_joy_about",
    met: [
      "happy",
      "excited",
      "enthusiastic",
      "good",
      "content",
      "energized",
      "inspired",
      "impassioned",
      "grateful",
      "desire",
      "surprised",
      "hopeful",
      "optimistic",
      "loved",
      "thankful",
    ],
    unmet: [
      "bored",
      "meh",
      "unmotivated",
      "fomo",
      "sad",
      "disappointed",
      "depressed",
      "pessimistic",
      "hyper",
      "tired",
      "hopeless",
      "grieved",
    ],
  },
] as const satisfies readonly Need[];

/** One {@link NEEDS} entry. */
export type NeedConfig = (typeof NEEDS)[number];

/** Key of one {@link NEEDS} entry. */
export type NeedKey = NeedConfig["key"];

/** Rated needs. Unrated needs have no key. */
export type NeedStates = Partial<Record<NeedKey, NeedState>>;

/** Feelings of one rated need, per side. Partly met fills both sides. */
export interface NeedFeelings {
  met: Emotion[];
  unmet: Emotion[];
}

/** Feelings shown before More. Fills four rows of the two-column grid. */
const PREVIEW_COUNT = 8;

/**
 * All feelings of one rated need, strongest match first. Met shows
 * pleasant emotions, unmet unpleasant ones, partly met both. Disabled
 * emotions and keys missing from `emotions` are skipped.
 */
export const feelingsForNeed = (
  need: Pick<Need, "met" | "unmet">,
  state: NeedState,
  emotions: Emotion[]
): NeedFeelings => {
  const byKey = new Map<string, Emotion>();
  for (const emotion of emotions) {
    if (emotion.disabled !== true) {
      byKey.set(emotion.key, emotion);
    }
  }
  const pick = (keys: readonly string[]) =>
    keys.flatMap((key) => byKey.get(key) ?? []);

  return {
    met: state === "unmet" ? [] : pick(need.met),
    unmet: state === "met" ? [] : pick(need.unmet),
  };
};

/**
 * Feelings visible before More: the first 8, or 4 per side when partly
 * met. A side with fewer than 4 leaves its room unused.
 */
export const previewFeelings = (feelings: NeedFeelings): NeedFeelings => {
  const hasBoth = feelings.met.length > 0 && feelings.unmet.length > 0;
  const perSide = hasBoth ? PREVIEW_COUNT / 2 : PREVIEW_COUNT;
  return {
    met: feelings.met.slice(0, perSide),
    unmet: feelings.unmet.slice(0, perSide),
  };
};

/**
 * Selected feelings that belong to a rated need, in need order. Shown on
 * the need tile. Empty for an unrated need.
 */
export const pickedForNeed = (
  need: Pick<Need, "met" | "unmet">,
  state: NeedState | undefined,
  selected: Emotion[]
): Emotion[] => {
  if (!state) {
    return [];
  }
  const feelings = feelingsForNeed(need, state, selected);
  return [...feelings.met, ...feelings.unmet];
};
