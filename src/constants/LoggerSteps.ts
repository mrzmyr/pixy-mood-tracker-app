/** Logger slides stay in fixed carousel order. */
export type LoggerStep =
  | "rating"
  | "tags"
  | "people"
  | "message"
  | "photos"
  | "feedback"
  | "reminder"
  | "emotions"
  | "sleep";

/** Settings omit the new-user reminder slide. */
export type ConfigurableLoggerStep = Exclude<LoggerStep, "reminder">;

/**
 * Order of the toggles on the Steps settings screen. `people` is off by
 * default and shows only behind the `people` feature flag.
 */
export const STEP_OPTIONS: ConfigurableLoggerStep[] = [
  "rating",
  "tags",
  "people",
  "sleep",
  "emotions",
  "message",
  "photos",
  "feedback",
];
