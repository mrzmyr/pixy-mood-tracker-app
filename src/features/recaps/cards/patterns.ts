import { GENERAL_CATEGORY_ID } from "@/features/tags";
import { getEffect } from "../correlation";
import type { Effect } from "../correlation";
import { addDays, dayHas } from "../days";
import { parsePlace } from "../places";
import { THRESHOLDS } from "../thresholds";
import type { EffectRow, PatternCard, RecapDay, RecapInput } from "../types";

const tagIdsOf = (day: RecapDay) =>
  new Set(day.items.flatMap((item) => item.tags.map((tag) => tag.id)));

/**
 * Week only. A tag on 2+ days this week whose days felt clearly lighter in
 * the 90 days before. Two cards at most, most days times lift first.
 */
export const stoodOut = (input: RecapInput): PatternCard[] => {
  if (!input.steps.has("tags")) {
    return [];
  }
  const from = addDays(input.period.start, -THRESHOLDS.stoodOutHistoryDays);
  const history = input.history.filter(
    (day) => day.date >= from && day.date < input.period.start
  );
  if (history.length < THRESHOLDS.stoodOutMinHistoryDays) {
    return [];
  }
  const weekCounts = new Map<string, number>();
  for (const day of input.days) {
    for (const id of tagIdsOf(day)) {
      weekCounts.set(id, (weekCounts.get(id) ?? 0) + 1);
    }
  }
  const known = new Set(input.tags.map((tag) => tag.id));
  const candidates: { tagId: string; count: number; effect: Effect }[] = [];
  for (const [tagId, count] of weekCounts) {
    if (known.has(tagId) && count >= THRESHOLDS.stoodOutMinDays) {
      const effect = getEffect(history, (day) => tagIdsOf(day).has(tagId));
      if (
        effect.signal === "strong" &&
        effect.delta > THRESHOLDS.stoodOutMinDelta
      ) {
        candidates.push({ tagId, count, effect });
      }
    }
  }
  return candidates
    .sort((a, b) => b.count * b.effect.delta - a.count * a.effect.delta)
    .slice(0, THRESHOLDS.stoodOutMaxCards)
    .map(({ tagId, count, effect }) => ({
      type: "stood-out",
      tagId,
      days: count,
      with: effect.with,
      without: effect.without,
    }));
};

interface Driver {
  id: string;
  label: string | null;
  has: (day: RecapDay) => boolean;
}

/** Rows with a medium or strong effect: biggest 8, lightest first. */
const rows = (days: RecapDay[], drivers: Driver[]): EffectRow[] => {
  const found: EffectRow[] = [];
  for (const { id, label, has } of drivers) {
    const effect = getEffect(days, has);
    if (effect.signal !== "weak") {
      found.push({
        id,
        label,
        days: effect.days,
        delta: effect.delta,
        signal: effect.signal,
      });
    }
  }
  return found
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, THRESHOLDS.whatMovesMaxRows)
    .sort((a, b) => b.delta - a.delta);
};

const placeOf = (day: RecapDay) => {
  const name = day.items.find((item) => item.location?.name)?.location?.name;
  const place = parsePlace(name);
  return place ? (place.district ?? place.city) : null;
};

/**
 * Quarter and year, 40+ check-in days. Tags, categories (never General),
 * and places on days with vs. without. Shows when any row is strong.
 */
export const whatMoves = (input: RecapInput): PatternCard[] => {
  if (
    !input.steps.has("tags") ||
    input.days.length < THRESHOLDS.whatMovesMinDays
  ) {
    return [];
  }
  const tagDrivers: Driver[] = input.tags.map((tag) => ({
    id: tag.id,
    label: null,
    has: (day) => tagIdsOf(day).has(tag.id),
  }));
  const categoryOf = new Map(
    input.tags.map((tag) => [tag.id, tag.categoryId ?? GENERAL_CATEGORY_ID])
  );
  const categoryDrivers: Driver[] = [];
  for (const category of input.tagCategories) {
    if (category.id !== GENERAL_CATEGORY_ID) {
      categoryDrivers.push({
        id: category.id,
        label: null,
        has: (day) =>
          [...tagIdsOf(day)].some((id) => categoryOf.get(id) === category.id),
      });
    }
  }
  const placeNames = new Set<string>();
  if (input.locationEnabled) {
    for (const day of input.days) {
      const name = placeOf(day);
      if (name) {
        placeNames.add(name);
      }
    }
  }
  const placeDrivers: Driver[] = [...placeNames].map((name) => ({
    id: name,
    label: name,
    has: (day) => placeOf(day) === name,
  }));
  const tags = rows(input.days, tagDrivers);
  const categories = rows(input.days, categoryDrivers);
  const places = rows(input.days, placeDrivers);
  const anyStrong = [...tags, ...categories, ...places].some(
    (row) => row.signal === "strong"
  );
  return anyStrong ? [{ type: "what-moves", tags, categories, places }] : [];
};

/**
 * Quarter and year, 4+ people with 5+ connected days. Mood on connected
 * days is a hint only: a connection can feel good, bad, or mixed. Rows keep
 * weak effects and show them as no clear difference.
 */
export const peopleMood = (input: RecapInput): PatternCard[] => {
  if (!input.steps.has("people") || !input.availableSteps.has("people")) {
    return [];
  }
  const people: EffectRow[] = [];
  for (const personId of input.personIds) {
    const effect = getEffect(input.days, (day) =>
      dayHas(day, (item) =>
        item.people.some((person) => person.id === personId)
      )
    );
    if (effect.days >= THRESHOLDS.effectMinDays) {
      people.push({
        id: personId,
        label: null,
        days: effect.days,
        delta: effect.delta,
        signal: effect.signal,
      });
    }
  }
  return people.length >= THRESHOLDS.peopleMoodMinPeople
    ? [
        {
          type: "people-mood",
          people: people.sort((a, b) => b.delta - a.delta),
        },
      ]
    : [];
};
