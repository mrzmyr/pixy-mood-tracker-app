import { EMOTIONS } from "./config";

/** Emotions of category `bad` or `very_bad`. */
const NEGATIVE_EMOTION_KEYS = new Set<string>();
for (const emotion of EMOTIONS) {
  if (emotion.category === "bad" || emotion.category === "very_bad") {
    NEGATIVE_EMOTION_KEYS.add(emotion.key);
  }
}

/**
 * True when any of `keys` is a `bad` or `very_bad` emotion. Such an entry is
 * a bad moment for a store review prompt, even with a good rating.
 */
export const hasNegativeEmotion = (keys: readonly string[]) =>
  keys.some((key) => NEGATIVE_EMOTION_KEYS.has(key));
