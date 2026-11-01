/** Not Helpful reasons. Analytics gets these keys, never free text. */
export const FEEDBACK_REASONS = [
  "not_true",
  "knew_already",
  "not_relevant",
  "too_personal",
  "hard_to_understand",
  "feels_judgmental",
] as const;

/** One of {@link FEEDBACK_REASONS}. */
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
