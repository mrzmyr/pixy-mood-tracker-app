/**
 * Numeric value per mood rating, 0 (worst) to 6 (best).
 *
 * Statistics and chart positions depend on these values; changing them
 * changes every average and trend.
 */
export const RATING_MAPPING = {
  extremely_good: 6,
  very_good: 5,
  good: 4,
  neutral: 3,
  bad: 2,
  very_bad: 1,
  extremely_bad: 0,
};

/** Numeric value per sleep quality, 0 (worst) to 4 (best). */
export const SLEEP_QUALITY_MAPPING = {
  very_good: 4,
  good: 3,
  neutral: 2,
  bad: 1,
  very_bad: 0,
};

/** Mood ratings ordered best to worst, following {@link RATING_MAPPING}. */
// SAFETY: Object.keys of these literal constants returns exactly their declared keys.
export const RATING_KEYS = Object.keys(
  RATING_MAPPING
) as (keyof typeof RATING_MAPPING)[];
/**
 * Sleep qualities ordered best to worst, following
 * {@link SLEEP_QUALITY_MAPPING}.
 */
// SAFETY: Object.keys of these literal constants returns exactly their declared keys.
export const SLEEP_QUALITY_KEYS = Object.keys(
  SLEEP_QUALITY_MAPPING
) as (keyof typeof SLEEP_QUALITY_MAPPING)[];
