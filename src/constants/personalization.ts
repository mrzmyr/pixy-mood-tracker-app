import { z } from "zod";

/** Why someone opens Pixy. Onboarding asks for one. */
export const PERSONALIZATION_GOALS = [
  "understand",
  "what_helps",
  "hard_time",
  "health",
  "remember",
] as const;

/** One of {@link PERSONALIZATION_GOALS}. */
export type PersonalizationGoal = (typeof PERSONALIZATION_GOALS)[number];

/**
 * What someone deals with lately. Onboarding asks for any number. Health
 * related answers stay on the device.
 */
export const PERSONALIZATION_STRUGGLES = [
  "stress",
  "anxiety",
  "low_mood",
  "sleep",
  "focus",
  "loneliness",
  "relationships",
  "work",
  "grief",
  "body",
  "medication",
] as const;

/** One of {@link PERSONALIZATION_STRUGGLES}. Can be health data. */
export type PersonalizationStruggle =
  (typeof PERSONALIZATION_STRUGGLES)[number];

/** Onboarding answers that shape suggestions. Empty when skipped. */
export interface PersonalizationAnswers {
  goal: PersonalizationGoal | null;
  struggles: PersonalizationStruggle[];
}

/** Answers of a user who skipped the questions or onboarded before them. */
export const EMPTY_PERSONALIZATION: PersonalizationAnswers = {
  goal: null,
  struggles: [],
};

/**
 * Parses stored answers. Unknown struggles, for example from a newer app
 * version, drop out. Any other mismatch fails the parse.
 */
export const PersonalizationAnswersSchema = z.object({
  goal: z.enum(PERSONALIZATION_GOALS).nullable(),
  struggles: z
    .array(z.string())
    .transform((values) =>
      PERSONALIZATION_STRUGGLES.filter((struggle) => values.includes(struggle))
    ),
});
