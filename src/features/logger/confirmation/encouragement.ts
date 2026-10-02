import { t } from "@/lib/translation";
import type { LogItem } from "@/features/logs";

/** Mood group that picks the tone of the saved message. */
export type MoodTone = "good" | "neutral" | "bad";

const TONES: Record<LogItem["rating"], MoodTone> = {
  extremely_good: "good",
  very_good: "good",
  good: "good",
  neutral: "neutral",
  bad: "bad",
  very_bad: "bad",
  extremely_bad: "bad",
};

/** Tone of the saved message: celebrate good days, support bad days. */
export const getMoodTone = (rating: LogItem["rating"]) => TONES[rating];

/** Translated title and body shown after saving an entry. */
export const getEncouragement = (rating: LogItem["rating"]) => {
  const tone = getMoodTone(rating);

  return {
    tone,
    title: t(`log_saved_${tone}_title`),
    body: t(`log_saved_${tone}_body`),
  };
};
