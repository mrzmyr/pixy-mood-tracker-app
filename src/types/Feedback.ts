/** Feedback category sent with reports. */
export type FeedackType =
  | "issue"
  | "idea"
  | "other"
  | "emoji"
  | "custom"
  | "emotion";

/**
 * Where feedback was sent from. `emotion_*` sources name an emotion picker
 * experiment, so feedback on it can be told apart.
 */
export const FEEDBACK_SOURCES = [
  "tags",
  "modal",
  "statistics",
  "error",
  "logger",
  "recaps",
  "emotion_dials",
  "emotion_weather",
] as const;

/** One of {@link FEEDBACK_SOURCES}. */
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

/** Check an untrusted value, for example a route parameter. */
export const isFeedbackSource = (value: unknown): value is FeedbackSource =>
  FEEDBACK_SOURCES.some((source) => source === value);
