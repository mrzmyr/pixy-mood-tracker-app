import { getEffect } from "../correlation";
import { fits, indexDays } from "../day-index";
import { addDays, daysBetween } from "../days";
import { THRESHOLDS } from "../thresholds";
import type {
  ChangeCard,
  DateKey,
  RecapDay,
  RecapInput,
  Trend,
  TrendSeries,
} from "../types";
import { getActiveTags } from "./nudges";
import { peopleOn } from "./summaries";

type TrendKind = "quarter" | "year";

interface Driver {
  id: string;
  label: string | null;
  has: (day: RecapDay) => boolean;
}

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Steady, or which way the effect moved. Above zero now: a lift that grew
 * or faded. At or below zero: weighs more or less than before. Direction,
 * not size, so heavier days turning lighter read as a growing lift. "Now"
 * rounds like the shown value, so a lift fading to +0.0 never reads as
 * weighing more.
 */
export const getTrend = (first: number, last: number): Trend => {
  const change = last - first;
  if (Math.abs(change) < THRESHOLDS.trendSteadyBelow) {
    return "steady";
  }
  const now = Math.round(last * 10) / 10;
  if (now > 0 || (now === 0 && change < 0)) {
    return change > 0 ? "growing-lift" : "fading-lift";
  }
  return change < 0 ? "weighs-more" : "weighs-less";
};

/**
 * Window ends from one window after the period start, every step, and
 * always the last day, so the newest days count. A last day close to the
 * previous end replaces it, so two windows never nearly overlap.
 */
const windowEnds = (days: RecapDay[], start: string, kind: TrendKind) => {
  const last = days.at(-1)?.date;
  const ends: string[] = [];
  if (!last) {
    return ends;
  }
  const window = THRESHOLDS.trendWindowDays[kind];
  const step = THRESHOLDS.trendStepDays[kind];
  for (
    let end = addDays(start, window - 1);
    daysBetween(end, last) >= 0;
    end = addDays(end, step)
  ) {
    ends.push(end);
  }
  const previous = ends.at(-1);
  if (previous && previous !== last) {
    if (daysBetween(previous, last) < step / 2) {
      ends[ends.length - 1] = last;
    } else {
      ends.push(last);
    }
  }
  return ends;
};

/** Lines that changed first, biggest change first; steady lines last. */
const byChange = (a: TrendSeries, b: TrendSeries) =>
  Number(a.trend === "steady") - Number(b.trend === "steady") ||
  Math.abs(b.last - b.first) - Math.abs(a.last - a.first);

/**
 * Rolling effect per driver over the period. A window counts when it has
 * 5+ days with and 5+ without the driver; a line needs data in more than
 * 55% of the windows. Top 5, changes first. `null` when every line is
 * steady.
 */
const trends = (
  input: RecapInput,
  days: RecapDay[],
  drivers: Driver[]
): { window: number; ends: DateKey[]; series: TrendSeries[] } | null => {
  const { kind } = input.period;
  if (kind !== "quarter" && kind !== "year") {
    return null;
  }
  const window = THRESHOLDS.trendWindowDays[kind];
  const ends = windowEnds(days, input.period.start, kind);
  if (ends.length < THRESHOLDS.trendMinPoints) {
    return null;
  }
  const windows = ends.map((end) => {
    const from = addDays(end, 1 - window);
    return days.filter((day) => day.date >= from && day.date <= end);
  });
  const series: TrendSeries[] = [];
  for (const { id, label, has } of drivers) {
    const values = windows.map((windowDays) => {
      const effect = getEffect(windowDays, has);
      const without = windowDays.length - effect.days;
      return effect.days >= THRESHOLDS.trendMinDays &&
        without >= THRESHOLDS.trendMinDays
        ? effect.delta
        : null;
    });
    const known = values.filter((value) => value !== null);
    if (known.length > values.length * THRESHOLDS.trendMinCoverage) {
      const third = Math.max(1, Math.floor(known.length / 3));
      const first = mean(known.slice(0, third));
      const last = mean(known.slice(-third));
      series.push({
        id,
        label,
        values,
        first,
        last,
        trend: getTrend(first, last),
      });
    }
  }
  const top = series.sort(byChange).slice(0, THRESHOLDS.trendMaxRows);
  return top.some((line) => line.trend !== "steady")
    ? { window, ends, series: top }
    : null;
};

/** Rolling T×M per active tag. */
export const trendTags = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-tags") || !input.steps.has("tags")) {
    return [];
  }
  const at = indexDays(input.days);
  const result = trends(
    input,
    input.days,
    getActiveTags(input.tags).map((tag) => ({
      id: tag.id,
      label: null,
      has: (day) => at(day).tags.has(tag.id),
    }))
  );
  return result ? [{ type: "trend-tags", ...result }] : [];
};

/** Rolling P×M per person. A hint over time, never a verdict. */
export const trendPeople = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-people") || !peopleOn(input)) {
    return [];
  }
  const at = indexDays(input.days);
  const result = trends(
    input,
    input.days,
    [...input.personIds].map((personId) => ({
      id: personId,
      label: null,
      has: (day) => at(day).people.has(personId),
    }))
  );
  return result ? [{ type: "trend-people", ...result }] : [];
};

/** Rolling L×M per place, on days with a place only. Location on. */
export const trendLocation = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-location") || !input.locationEnabled) {
    return [];
  }
  const at = indexDays(input.days);
  const placed = input.days.filter((day) => at(day).places.size > 0);
  const names = new Set(placed.flatMap((day) => [...at(day).places]));
  const result = trends(
    input,
    placed,
    [...names].map((name) => ({
      id: name,
      label: name,
      has: (day) => at(day).places.has(name),
    }))
  );
  return result ? [{ type: "trend-location", ...result }] : [];
};
