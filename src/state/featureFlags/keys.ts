/**
 * Feature flag keys. Each key needs a boolean flag with the same key in the
 * PostHog project of every app variant.
 */
export const FEATURE_FLAGS = [
  "photos",
  "support-pixy",
  "people",
  "calendar-view",
] as const;

/** One key of {@link FEATURE_FLAGS}. */
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

/** Check an untrusted value, for example a deep link parameter. */
export const isFeatureFlag = (value: unknown): value is FeatureFlag =>
  FEATURE_FLAGS.some((key) => key === value);
