import { RATING_KEYS } from "@/constants/ratings";
import type { RATING_MAPPING } from "@/constants/ratings";
import { t } from "@/lib/translation";
import { matchTranscript } from "./match-transcript";

type Rating = keyof typeof RATING_MAPPING;

/** Word or phrase that sets the mood of a voice check-in when spoken. */
export interface MoodTrigger {
  rating: Rating;
  text: string;
}

const TRIGGER_KEYS = {
  extremely_good: "voice_mood_extremely_good",
  very_good: "voice_mood_very_good",
  good: "voice_mood_good",
  neutral: "voice_mood_neutral",
  bad: "voice_mood_bad",
  very_bad: "voice_mood_very_bad",
  extremely_bad: "voice_mood_extremely_bad",
} as const satisfies Record<Rating, string>;

/** One trigger per rating in the app language, best to worst. */
export const getMoodTriggers = (): MoodTrigger[] =>
  RATING_KEYS.map((rating) => ({ rating, text: t(TRIGGER_KEYS[rating]) }));

/**
 * Rating of the first trigger in `transcript`, or `null` when none is
 * spoken. Matches like `matchTranscript`: whole words, longest trigger wins,
 * so "very bad" sets `very_bad`, not `bad`. Later triggers never change it.
 */
export const matchMood = (
  transcript: string,
  triggers: MoodTrigger[]
): Rating | null => {
  const [first] = matchTranscript(
    transcript,
    triggers.map(({ rating, text }) => ({ kind: "mood", id: rating, text }))
  );
  return triggers.find(({ rating }) => rating === first?.id)?.rating ?? null;
};
