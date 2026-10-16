import { GENERAL_CATEGORY_ID } from "@/features/tags";
import { CARD_TYPES } from "../cardTypes";
import { getEffect } from "../correlation";
import type { Effect } from "../correlation";
import { addDays } from "../days";
import { parsePlace } from "../places";
import { THRESHOLDS } from "../thresholds";
import type {
  CardType,
  EffectRow,
  PatternCard,
  RecapDay,
  RecapInput,
} from "../types";
import { getActiveTags } from "./nudges";
import { peopleOn } from "./summaries";

const fits = (input: RecapInput, type: CardType) =>
  CARD_TYPES[type].periods.includes(input.period.kind);

/** What a day holds, computed once so drivers only look things up. */
interface DayIndex {
  tags: Set<string>;
  people: Set<string>;
  /** Full place name, "District, City". */
  place: string | null;
}

const indexDays = (days: RecapDay[]) =>
  new Map<string, DayIndex>(
    days.map((day) => {
      const name = day.items.find((item) => item.location?.name)?.location
        ?.name;
      return [
        day.date,
        {
          tags: new Set(
            day.items.flatMap((item) => item.tags.map((tag) => tag.id))
          ),
          people: new Set(
            day.items.flatMap((item) => item.people.map((person) => person.id))
          ),
          place: parsePlace(name) ? (name ?? null) : null,
        },
      ];
    })
  );

const EMPTY: DayIndex = { tags: new Set(), people: new Set(), place: null };

/**
 * Week only. An active tag on 2+ days this week whose days felt clearly
 * lighter in the 90 days before. Two cards at most, most days times lift
 * first.
 */
export const stoodOut = (input: RecapInput): PatternCard[] => {
  if (!fits(input, "stood-out") || !input.steps.has("tags")) {
    return [];
  }
  const from = addDays(input.period.start, -THRESHOLDS.stoodOutHistoryDays);
  const history = input.history.filter(
    (day) => day.date >= from && day.date < input.period.start
  );
  if (history.length < THRESHOLDS.stoodOutMinHistoryDays) {
    return [];
  }
  const index = indexDays([...history, ...input.days]);
  const at = (day: RecapDay) => index.get(day.date) ?? EMPTY;
  const weekCounts = new Map<string, number>();
  for (const day of input.days) {
    for (const id of at(day).tags) {
      weekCounts.set(id, (weekCounts.get(id) ?? 0) + 1);
    }
  }
  const active = new Set(getActiveTags(input.tags).map((tag) => tag.id));
  const candidates: { tagId: string; count: number; effect: Effect }[] = [];
  for (const [tagId, count] of weekCounts) {
    if (active.has(tagId) && count >= THRESHOLDS.stoodOutMinDays) {
      const effect = getEffect(history, (day) => at(day).tags.has(tagId));
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
    .map(({ tagId, count }) => ({
      type: "stood-out",
      tagId,
      days: count,
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

/**
 * Quarter and year, 40+ check-in days. Active tags, categories (never
 * General), and places on days with vs. without. Places compare only days
 * that have a place. Shows when any row is strong.
 */
export const whatMoves = (input: RecapInput): PatternCard[] => {
  if (
    !fits(input, "what-moves") ||
    !input.steps.has("tags") ||
    input.days.length < THRESHOLDS.whatMovesMinDays
  ) {
    return [];
  }
  const index = indexDays(input.days);
  const at = (day: RecapDay) => index.get(day.date) ?? EMPTY;
  const activeTags = getActiveTags(input.tags);
  const tags = rows(
    input.days,
    activeTags.map((tag) => ({
      id: tag.id,
      label: null,
      has: (day) => at(day).tags.has(tag.id),
    }))
  );
  const categoryOf = new Map(
    activeTags.map((tag) => [tag.id, tag.categoryId ?? GENERAL_CATEGORY_ID])
  );
  const categoryDrivers: Driver[] = [];
  for (const category of input.tagCategories) {
    if (category.id !== GENERAL_CATEGORY_ID) {
      categoryDrivers.push({
        id: category.id,
        label: null,
        has: (day) =>
          [...at(day).tags].some((id) => categoryOf.get(id) === category.id),
      });
    }
  }
  const categories = rows(input.days, categoryDrivers);
  const placed = input.locationEnabled
    ? input.days.filter((day) => at(day).place !== null)
    : [];
  const placeNames = new Set(placed.flatMap((day) => at(day).place ?? []));
  const places = rows(
    placed,
    [...placeNames].map((name) => ({
      id: name,
      label: name,
      has: (day) => at(day).place === name,
    }))
  );
  const anyStrong = [...tags, ...categories, ...places].some(
    (row) => row.signal === "strong"
  );
  return anyStrong ? [{ type: "what-moves", tags, categories, places }] : [];
};

/** Clear effects first by lift, then "no clear difference" rows. */
const byClarity = (a: EffectRow, b: EffectRow) =>
  Number(a.signal === "weak") - Number(b.signal === "weak") ||
  b.delta - a.delta;

/**
 * Quarter and year, 4+ people with 5+ connected days, and at least one
 * medium or strong row. Mood on connected days is a hint only: a
 * connection can feel good, bad, or mixed. Weak rows read as no clear
 * difference. 8 rows at most.
 */
export const peopleMood = (input: RecapInput): PatternCard[] => {
  if (!fits(input, "people-mood") || !peopleOn(input)) {
    return [];
  }
  const index = indexDays(input.days);
  const connected = new Map<string, number>();
  for (const { people } of index.values()) {
    for (const id of people) {
      if (input.personIds.has(id)) {
        connected.set(id, (connected.get(id) ?? 0) + 1);
      }
    }
  }
  const people: EffectRow[] = [];
  for (const [personId, count] of connected) {
    if (count >= THRESHOLDS.effectMinDays) {
      const effect = getEffect(
        input.days,
        (day) => index.get(day.date)?.people.has(personId) ?? false
      );
      people.push({
        id: personId,
        label: null,
        delta: effect.delta,
        signal: effect.signal,
      });
    }
  }
  const clear = people.some((row) => row.signal !== "weak");
  return clear && people.length >= THRESHOLDS.peopleMoodMinPeople
    ? [
        {
          type: "people-mood",
          people: people.sort(byClarity).slice(0, THRESHOLDS.peopleMoodMaxRows),
        },
      ]
    : [];
};
