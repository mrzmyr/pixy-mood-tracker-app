/** Logger slides stay in fixed carousel order. */
export type LoggerStep =
  | "rating"
  | "tags"
  | "message"
  | "feedback"
  | "reminder"
  | "emotions";

/** Settings omit the new-user reminder slide. */
export type ConfigurableLoggerStep = Exclude<LoggerStep, "reminder">;

/** Order of the toggles on the Steps settings screen. */
export const STEP_OPTIONS: ConfigurableLoggerStep[] = [
  "rating",
  "tags",
  "emotions",
  "message",
  "feedback",
];
