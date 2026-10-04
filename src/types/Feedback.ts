/** Feedback category sent with reports. */
export type FeedackType =
  | "issue"
  | "idea"
  | "other"
  | "emoji"
  | "custom"
  | "emotion";

/** Where feedback was sent from. */
export type FeedbackSource =
  | "tags"
  | "modal"
  | "statistics"
  | "error"
  | "logger"
  | "settings";
