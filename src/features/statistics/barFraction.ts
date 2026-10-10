/**
 * Share of the full bar that `count` fills, from 0 to 1. The row with the
 * highest count fills the bar (`count === max`), the others fill `count / max`.
 * Every row of one chart must pass the same `max`, so equal counts give equal
 * bars. A zero or invalid `max` or `count` gives an empty bar, never `NaN`.
 */
export const getBarFraction = (count: number, max: number): number => {
  if (!(max > 0) || !(count > 0)) {
    return 0;
  }
  return Math.min(count / max, 1);
};

/** Highest count of `rows`, the shared `max` of one bar chart. */
export const getMaxCount = (rows: { count: number }[]): number => {
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, row.count);
  }
  return max;
};
