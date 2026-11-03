import { getMostUsedEmotions } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../../config";

const MAX_BASIC_EMOTIONS = 36;

/** The basic grid sorts by good, neutral, and bad only. */
export const toBasicCategory = (emotion: Emotion): Emotion => ({
  ...emotion,
  category: (
    {
      very_bad: "bad",
      bad: "bad",
      neutral: "neutral",
      good: "good",
      very_good: "good",
    } satisfies Record<Emotion["category"], Emotion["category"]>
  )[emotion.category],
});

const appendMissingEmotions = (
  emotions: Emotion[],
  candidates: Emotion[]
): Emotion[] => {
  if (emotions.length >= MAX_BASIC_EMOTIONS) {
    return emotions;
  }

  const emotionKeys = new Set(emotions.map((emotion) => emotion.key));
  const missingEmotions = candidates
    .filter((d) => !emotionKeys.has(d.key))
    .slice(0, MAX_BASIC_EMOTIONS - emotions.length);

  return [...emotions, ...missingEmotions];
};

/**
 * Emotions of the basic grid, up to 36: `selected`, then the 20 most used in
 * `items`, then the predefined basic set. Categories reduced for the grid.
 */
export const getBasicEmotions = (
  selected: Emotion[],
  items: LogItem[]
): Emotion[] => {
  const mostUsedEmotionKeys = new Set(
    getMostUsedEmotions(items)
      .map((d) => d.key)
      .slice(0, 20)
  );
  const mostUsedEmotions = EMOTIONS.filter((d) =>
    mostUsedEmotionKeys.has(d.key)
  );
  const predefinedBasicEmotions = EMOTIONS.filter(
    (e) => e.mode === "basic" && e.disabled !== true
  );

  return appendMissingEmotions(
    appendMissingEmotions(selected, mostUsedEmotions),
    predefinedBasicEmotions
  ).map(toBasicCategory);
};

const PAGE_BY_RATING: Record<LogItem["rating"], number> = {
  extremely_bad: 0,
  very_bad: 1,
  bad: 1,
  neutral: 2,
  good: 3,
  very_good: 3,
  extremely_good: 4,
};

/** First emotion page for a mood: its category. No mood opens neutral. */
export const getEmotionPageIndex = (rating: LogItem["rating"] | null) =>
  PAGE_BY_RATING[rating ?? "neutral"];
