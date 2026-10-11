import { CARD_TYPES } from "../cardTypes";
import { getEffect } from "../correlation";
import { addDays, daysBetween } from "../days";
import { parsePlace } from "../places";
import { THRESHOLDS } from "../thresholds";
import type {
  ChangeCard,
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
 * not size, so heavier days turning lighter read as a growing lift.
 */
export const getTrend = (first: number, last: number): Trend => {
  const change = last - first;
  if (Math.abs(change) < THRESHOLDS.trendSteadyBelow) {
    return "steady";
  }
  if (last > 0) {
    return change > 0 ? "growing-lift" : "fading-lift";
  }
  return change < 0 ? "weighs-more" : "weighs-less";
};

/** Window ends from one window after the period start to its last day. */
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
  return ends;
};

/**
 * Rolling effect per driver over the period, top 5 by the latest effect.
 * Drivers need data in more than 55% of the windows. Empty when every
 * line is steady.
 */
const trends = (
  input: RecapInput,
  days: RecapDay[],
  drivers: Driver[]
): { window: number; series: TrendSeries[] } | null => {
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
    // A window needs enough days with and without the driver to compare.
    const values = windows.map((windowDays) => {
      const effect = getEffect(windowDays, has);
      const without = windowDays.length - effect.days;
      return effect.days >= THRESHOLDS.trendMinDays[kind] &&
        without >= THRESHOLDS.trendMinDays[kind]
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
  const top = series
    .sort((a, b) => Math.abs(b.last) - Math.abs(a.last))
    .slice(0, THRESHOLDS.trendMaxRows);
  return top.some((line) => line.trend !== "steady")
    ? { window, series: top }
    : null;
};

const fits = (input: RecapInput, type: ChangeCard["type"]) =>
  CARD_TYPES[type].periods.includes(input.period.kind);

const tagSet = (day: RecapDay) =>
  new Set(day.items.flatMap((item) => item.tags.map((tag) => tag.id)));

/** Rolling T×M per active tag. */
export const trendTags = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-tags") || !input.steps.has("tags")) {
    return [];
  }
  const result = trends(
    input,
    input.days,
    getActiveTags(input.tags).map((tag) => ({
      id: tag.id,
      label: null,
      has: (day) => tagSet(day).has(tag.id),
    }))
  );
  return result ? [{ type: "trend-tags", ...result }] : [];
};

/** Rolling P×M per person. A hint over time, never a verdict. */
export const trendPeople = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-people") || !peopleOn(input)) {
    return [];
  }
  const result = trends(
    input,
    input.days,
    [...input.personIds].map((personId) => ({
      id: personId,
      label: null,
      has: (day) =>
        day.items.some((item) =>
          item.people.some((person) => person.id === personId)
        ),
    }))
  );
  return result ? [{ type: "trend-people", ...result }] : [];
};

const placeOf = (day: RecapDay) => {
  const name = day.items.find((item) => item.location?.name)?.location?.name;
  return parsePlace(name) ? (name ?? null) : null;
};

/** Rolling L×M per place, on days with a place only. Location on. */
export const trendLocation = (input: RecapInput): ChangeCard[] => {
  if (!fits(input, "trend-location") || !input.locationEnabled) {
    return [];
  }
  const placed = input.days.filter((day) => placeOf(day) !== null);
  const names = new Set(placed.flatMap((day) => placeOf(day) ?? []));
  const result = trends(
    input,
    placed,
    [...names].map((name) => ({
      id: name,
      label: name,
      has: (day) => placeOf(day) === name,
    }))
  );
  return result ? [{ type: "trend-location", ...result }] : [];
};
