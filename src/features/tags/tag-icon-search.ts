import { TAG_ICON_KEYS, TAG_ICONS } from "./tag-icons";
import type { TagIconKey } from "./tag-icons";

const EXACT_SCORE = 3;
const PREFIX_SCORE = 1;
/** Shortest word that may match a longer keyword from its start, like "runn". */
const MIN_STEM_LENGTH = 4;

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1);

/**
 * Icons whose key or keywords match the words of `text`, best match first.
 * An exact word scores higher than a prefix, so "run" ranks `run` above
 * `running shoes`. Empty for text without a match.
 */
export const rankTagIcons = (text: string): TagIconKey[] => {
  const queryWords = words(text);
  if (queryWords.length === 0) {
    return [];
  }

  const scores = new Map<TagIconKey, number>();
  for (const key of TAG_ICON_KEYS) {
    const { keywords } = TAG_ICONS[key];
    const terms = [key.toLowerCase(), ...keywords];
    let score = 0;
    for (const word of queryWords) {
      for (const term of terms) {
        if (term === word) {
          score += EXACT_SCORE;
        } else if (
          term.startsWith(word) ||
          (word.length >= MIN_STEM_LENGTH && word.startsWith(term))
        ) {
          score += PREFIX_SCORE;
        }
      }
    }
    if (score > 0) {
      scores.set(key, score);
    }
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
};
