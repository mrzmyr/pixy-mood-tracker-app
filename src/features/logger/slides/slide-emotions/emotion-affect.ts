import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";

/**
 * Where an emotion sits on the two dials of the dials picker (flag
 * `emotion-picker`, variant `slider`). Both axes run from -2 to 2: `pleasantness` from
 * unpleasant to pleasant, `energy` from drained to buzzing. Values follow
 * the affect grid (Russell 1980), placed by hand. Every enabled emotion in
 * `src/features/logger/config.ts` needs an entry.
 */
export const EMOTION_AFFECT = {
  accepted: { pleasantness: 1.2, energy: 0.1 },
  alienated: { pleasantness: -1.4, energy: -0.6 },
  angry: { pleasantness: -1.8, energy: 1.9 },
  annoyed: { pleasantness: -0.9, energy: 0.9 },
  anxious: { pleasantness: -1.4, energy: 1.4 },
  appreciated: { pleasantness: 1.4, energy: 0.3 },
  ashamed: { pleasantness: -1.7, energy: -0.3 },
  awkward: { pleasantness: -0.6, energy: 0.5 },
  balanced: { pleasantness: 1, energy: -0.5 },
  bored: { pleasantness: -0.5, energy: -1.3 },
  brave: { pleasantness: 1.2, energy: 1.2 },
  calm: { pleasantness: 1.1, energy: -1.3 },
  comfortable: { pleasantness: 1, energy: -1 },
  compassionate: { pleasantness: 0.9, energy: -0.1 },
  concerned: { pleasantness: -0.7, energy: 0.4 },
  confused: { pleasantness: -0.4, energy: 0.6 },
  connected: { pleasantness: 1.4, energy: 0.4 },
  content: { pleasantness: 1.3, energy: -0.8 },
  depressed: { pleasantness: -1.9, energy: -1.8 },
  desire: { pleasantness: 0.5, energy: 1.2 },
  disappointed: { pleasantness: -1.1, energy: -0.6 },
  distracted: { pleasantness: -0.4, energy: 0.7 },
  embarrassed: { pleasantness: -1, energy: 1 },
  energized: { pleasantness: 1.5, energy: 2 },
  enthusiastic: { pleasantness: 1.6, energy: 1.7 },
  excited: { pleasantness: 1.7, energy: 1.9 },
  exhausted: { pleasantness: -1.2, energy: -1.9 },
  fearful: { pleasantness: -1.6, energy: 1.5 },
  focused: { pleasantness: 0.8, energy: 0.8 },
  fomo: { pleasantness: -0.8, energy: 0.9 },
  fragile: { pleasantness: -1, energy: -0.8 },
  frustrated: { pleasantness: -1.4, energy: 1.3 },
  good: { pleasantness: 1, energy: 0 },
  grateful: { pleasantness: 1.5, energy: -0.2 },
  grieved: { pleasantness: -1.7, energy: -1.2 },
  guilty: { pleasantness: -1.4, energy: 0.2 },
  happy: { pleasantness: 1.9, energy: 1 },
  heard: { pleasantness: 1.2, energy: -0.2 },
  hopeful: { pleasantness: 1.2, energy: 0.4 },
  hopeless: { pleasantness: -1.9, energy: -1.4 },
  hyper: { pleasantness: 0.6, energy: 2 },
  impassioned: { pleasantness: 1.2, energy: 1.8 },
  impatient: { pleasantness: -0.9, energy: 1.3 },
  insecure: { pleasantness: -1.1, energy: 0.2 },
  inspired: { pleasantness: 1.6, energy: 1.3 },
  irritated: { pleasantness: -1, energy: 1 },
  lonely: { pleasantness: -1.4, energy: -1 },
  loved: { pleasantness: 1.9, energy: 0.2 },
  meh: { pleasantness: -0.3, energy: -1 },
  motivated: { pleasantness: 1.4, energy: 1.4 },
  nervous: { pleasantness: -1, energy: 1.5 },
  optimistic: { pleasantness: 1.3, energy: 0.6 },
  overwhelmed: { pleasantness: -1.4, energy: 1.6 },
  pessimistic: { pleasantness: -1, energy: -0.5 },
  pressured: { pleasantness: -1.2, energy: 1.2 },
  productive: { pleasantness: 1.1, energy: 0.9 },
  proud: { pleasantness: 1.8, energy: 1.1 },
  rejected: { pleasantness: -1.7, energy: -0.4 },
  relieved: { pleasantness: 1.3, energy: -0.9 },
  restless: { pleasantness: -0.8, energy: 1.5 },
  sad: { pleasantness: -1.5, energy: -1.1 },
  satisfied: { pleasantness: 1.4, energy: -0.4 },
  stressed: { pleasantness: -1.4, energy: 1.4 },
  supported: { pleasantness: 1.3, energy: -0.3 },
  surprised: { pleasantness: 0.3, energy: 1.6 },
  thankful: { pleasantness: 1.3, energy: -0.3 },
  tired: { pleasantness: -0.5, energy: -1.7 },
  uneasy: { pleasantness: -0.9, energy: 0.5 },
  unmotivated: { pleasantness: -0.7, energy: -1.4 },
  vulnerable: { pleasantness: -0.8, energy: -0.4 },
  weak: { pleasantness: -1, energy: -1.6 },
  worried: { pleasantness: -1.1, energy: 0.8 },
} satisfies Record<string, DialValues>;

/** Position of both dials, each from {@link DIAL_MIN} to {@link DIAL_MAX}. */
export interface DialValues {
  pleasantness: number;
  energy: number;
}

/** Lowest dial value: unpleasant or drained. */
export const DIAL_MIN = -2;
/** Highest dial value: pleasant or buzzing. */
export const DIAL_MAX = 2;

/**
 * Starting pleasantness from the mood rating of the check-in, so often only
 * energy needs a move.
 */
export const RATING_PLEASANTNESS: Record<LogItem["rating"], number> = {
  extremely_good: 2,
  very_good: 1.5,
  good: 1,
  neutral: 0,
  bad: -1,
  very_bad: -1.5,
  extremely_bad: -2,
};

/** Distance on the affect grid between an emotion and the dial position. */
const distance = (emotion: Emotion, dials: DialValues) => {
  // Keys are open strings: an emotion without an entry sorts last.
  const affect = Object.entries(EMOTION_AFFECT).find(
    ([key]) => key === emotion.key
  )?.[1];
  if (!affect) {
    return Infinity;
  }
  return Math.hypot(
    affect.pleasantness - dials.pleasantness,
    affect.energy - dials.energy
  );
};

/**
 * Emotions closest to the dial position first. Uses distance only, never
 * history, so past picks get no boost. `fit` runs from 0 to 100.
 */
export const rankByAffect = (emotions: Emotion[], dials: DialValues) =>
  emotions
    .map((emotion) => {
      const d = distance(emotion, dials);
      return {
        emotion,
        distance: d,
        fit: Math.round(Math.max(0, 100 - d * 25)),
      };
    })
    .sort((a, b) => a.distance - b.distance);
