import { getDayRating } from "./days";
import { THRESHOLDS } from "./thresholds";
import type { RecapDay } from "./types";

/** Signal of an effect. Weak effects never become cards or rows. */
export type EffectSignal = "strong" | "medium" | "weak";

/**
 * How days with a driver (tag, category, place, person) compare to days
 * without it, in mood steps (rating 0 to 6).
 */
export interface Effect {
  /** Days with the driver. */
  days: number;
  with: number;
  without: number;
  /** `with` minus `without`. Positive: those days feel lighter. */
  delta: number;
  signal: EffectSignal;
}

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const variance = (values: number[]) => {
  const average = mean(values);
  return mean(values.map((value) => (value - average) ** 2));
};

/** Difference over its standard error. No spread: any difference is sure. */
const getScore = (delta: number, error: number) => {
  if (error > 0) {
    return Math.abs(delta) / error;
  }
  return Math.abs(delta) > 0 ? Number.POSITIVE_INFINITY : 0;
};

/**
 * Mood on days with vs. without, and how sure that difference is: the
 * difference over its standard error. 2+ is strong, 1+ medium. Fewer than
 * 5 days with the driver, or none without, is always weak.
 */
export const getEffect = (
  days: RecapDay[],
  has: (day: RecapDay) => boolean
): Effect => {
  const withDriver: number[] = [];
  const withoutDriver: number[] = [];
  for (const day of days) {
    (has(day) ? withDriver : withoutDriver).push(getDayRating(day));
  }
  if (withDriver.length === 0 || withoutDriver.length === 0) {
    return {
      days: withDriver.length,
      with: withDriver.length > 0 ? mean(withDriver) : 0,
      without: withoutDriver.length > 0 ? mean(withoutDriver) : 0,
      delta: 0,
      signal: "weak",
    };
  }
  const delta = mean(withDriver) - mean(withoutDriver);
  const error = Math.sqrt(
    variance(withDriver) / withDriver.length +
      variance(withoutDriver) / withoutDriver.length
  );
  const score = getScore(delta, error);
  const enough = withDriver.length >= THRESHOLDS.effectMinDays;
  let signal: EffectSignal = "weak";
  if (enough && score >= THRESHOLDS.effectStrongScore) {
    signal = "strong";
  } else if (enough && score >= THRESHOLDS.effectMediumScore) {
    signal = "medium";
  }
  return {
    days: withDriver.length,
    with: mean(withDriver),
    without: mean(withoutDriver),
    delta,
    signal,
  };
};
