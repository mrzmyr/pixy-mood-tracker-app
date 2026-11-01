/** Gap between two parts starting. Small, so the start sweeps across the line. */
export const TEXT_REVEAL_STAGGER_MS = 24;
/** One part's animation. Much longer than the stagger, so parts overlap. */
export const TEXT_REVEAL_DURATION_MS = 700;

/** Animate each letter, or each word for long text. */
export type TextRevealUnit = "char" | "word";

/** One word with the parts that animate, each with its place in the order. */
export interface TextRevealWord {
  parts: { text: string; order: number }[];
}

/** Words of `text`, split into letters or kept whole, numbered in reading order. */
export const getTextRevealWords = (
  text: string,
  by: TextRevealUnit
): TextRevealWord[] => {
  let order = 0;
  return text
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => ({
      parts: (by === "char" ? [...word] : [word]).map((part) => {
        order += 1;
        return { text: part, order: order - 1 };
      }),
    }));
};

/** Time from start until the last part of `text` is fully shown. */
export const getTextRevealDuration = (
  text: string,
  by: TextRevealUnit = "char"
) => {
  const count = getTextRevealWords(text, by).reduce(
    (sum, word) => sum + word.parts.length,
    0
  );
  return (
    Math.max(count - 1, 0) * TEXT_REVEAL_STAGGER_MS + TEXT_REVEAL_DURATION_MS
  );
};
