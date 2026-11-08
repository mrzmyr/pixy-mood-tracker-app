import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { dayHas, daysBetween, getMeanRating } from "../days";
import { distanceKm, parsePlace } from "../places";
import { THRESHOLDS } from "../thresholds";
import type {
  EmotionBack,
  MomentCard,
  PersonMoment,
  RecapDay,
  RecapInput,
  TagBack,
} from "../types";

const CATEGORY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion.category])
);
const GOOD = new Set(["very_good", "good"]);

const isGoodEmotion = (key: string) => GOOD.has(CATEGORY.get(key) ?? "");

const before = ({ history, period }: RecapInput) =>
  history.filter((day) => day.date < period.start);

const lastWith = (days: RecapDay[], test: (item: LogItem) => boolean) =>
  days.findLast((day) => dayHas(day, test)) ?? null;

const firstWith = (days: RecapDay[], test: (item: LogItem) => boolean) =>
  days.find((day) => dayHas(day, test)) ?? null;

const weeks = (days: number) => Math.round(days / 7);

/** Most emotions in one emotions-back card. */
const MAX_EMOTIONS_BACK = 3;

/**
 * Good emotions, first time in 30+ days, in one card: longest break first,
 * up to 3.
 */
export const emotionAgain = (input: RecapInput): MomentCard[] => {
  if (!input.steps.has("emotions")) {
    return [];
  }
  const earlier = before(input);
  const keys = new Set(
    input.days.flatMap((day) =>
      day.items.flatMap((item) => item.emotions.filter(isGoodEmotion))
    )
  );
  const found: (EmotionBack & { gap: number })[] = [];
  for (const emotion of keys) {
    const has = (item: LogItem) => item.emotions.some((key) => key === emotion);
    const first = firstWith(input.days, has);
    const last = lastWith(earlier, has);
    if (first && last) {
      const gap = daysBetween(last.date, first.date);
      if (gap >= THRESHOLDS.emotionAgainMinGapDays) {
        found.push({ emotion, lastDate: last.date, gap });
      }
    }
  }
  const emotions = found
    .sort((a, b) => b.gap - a.gap)
    .slice(0, MAX_EMOTIONS_BACK)
    .map(({ emotion, lastDate }) => ({ emotion, lastDate }));
  return emotions.length > 0 ? [{ type: "emotion-again", emotions }] : [];
};

const connectedDaysIn = (days: RecapDay[], personId: string) =>
  days.filter((day) =>
    dayHas(day, (item) => item.people.some((person) => person.id === personId))
  );

/**
 * People connected in the period who are back after 28+ days, connected for
 * the first time, or at a milestone of connected days in the calendar year.
 * Back wins over a milestone, a milestone over new. People keep the order of
 * their first connection in the period.
 */
export const getPersonMoments = (input: RecapInput): PersonMoment[] => {
  if (!input.steps.has("people") || !input.availableSteps.has("people")) {
    return [];
  }
  const earlier = before(input);
  const ids = new Set(
    input.days.flatMap((day) =>
      day.items.flatMap((item) =>
        item.people.flatMap((person) =>
          input.personIds.has(person.id) ? [person.id] : []
        )
      )
    )
  );
  const year = Number(input.period.end.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const people: PersonMoment[] = [];
  for (const personId of ids) {
    const [first] = connectedDaysIn(input.days, personId);
    const lastBefore = connectedDaysIn(earlier, personId).at(-1);
    const gap = lastBefore ? daysBetween(lastBefore.date, first.date) : 0;
    const inYear = connectedDaysIn(
      input.history.filter(
        (day) => day.date >= yearStart && day.date <= input.period.end
      ),
      personId
    ).length;
    const inYearBefore = connectedDaysIn(
      earlier.filter((day) => day.date >= yearStart),
      personId
    ).length;
    const milestone = THRESHOLDS.personMilestones.findLast(
      (count) => inYearBefore < count && inYear >= count
    );
    if (lastBefore && gap >= THRESHOLDS.personBackMinGapDays) {
      people.push({
        kind: "back",
        personId,
        lastDate: lastBefore.date,
        weeks: weeks(gap),
      });
    } else if (milestone !== undefined) {
      people.push({ kind: "milestone", personId, days: milestone, year });
    } else if (!lastBefore && earlier.length >= THRESHOLDS.newMinHistoryDays) {
      people.push({ kind: "new", personId, firstDate: first.date });
    }
  }
  return people;
};

/** One card for all person moments of the period. */
export const personMoments = (input: RecapInput): MomentCard[] => {
  const people = getPersonMoments(input);
  return people.length > 0 ? [{ type: "people-moments", people }] : [];
};

/**
 * First check-in far from every earlier place. Location on, and 15+ earlier
 * days with a place. Compares coordinates, not names: place names change
 * with the device language.
 */
export const firstCity = (input: RecapInput): MomentCard[] => {
  if (!input.locationEnabled) {
    return [];
  }
  const places: NonNullable<LogItem["location"]>[] = [];
  let placedDays = 0;
  for (const day of before(input)) {
    const dayPlaces = day.items.flatMap((item) => item.location ?? []);
    places.push(...dayPlaces);
    placedDays += dayPlaces.length > 0 ? 1 : 0;
  }
  if (placedDays < THRESHOLDS.newMinHistoryDays) {
    return [];
  }
  for (const day of input.days) {
    for (const item of day.items) {
      const place = parsePlace(item.location?.name);
      const { location } = item;
      if (
        place &&
        location &&
        places.every(
          (earlier) => distanceKm(earlier, location) > THRESHOLDS.newCityMinKm
        )
      ) {
        return [{ type: "first-city", ...place, date: day.date }];
      }
    }
  }
  return [];
};

/**
 * Tags back after 21+ days, used on 8+ days before, and days with them feel
 * at least as good as an average day, in one card. Tags carry no meaning,
 * so a heavy tag never gets a welcome back.
 */
export const tagBack = (input: RecapInput): MomentCard[] => {
  if (!input.steps.has("tags")) {
    return [];
  }
  const earlier = before(input);
  const usual = getMeanRating(input.history) ?? 0;
  const ids = new Set(
    input.days.flatMap((day) =>
      day.items.flatMap((item) => item.tags.map((tag) => tag.id))
    )
  );
  const known = new Set(input.tags.map((tag) => tag.id));
  const tags: TagBack[] = [];
  for (const tagId of ids) {
    const has = (item: LogItem) => item.tags.some((tag) => tag.id === tagId);
    const first = firstWith(input.days, has);
    const last = lastWith(earlier, has);
    const usesBefore = earlier.filter((day) => dayHas(day, has)).length;
    const tagMean =
      getMeanRating(input.history.filter((day) => dayHas(day, has))) ?? 0;
    if (
      known.has(tagId) &&
      first &&
      last &&
      daysBetween(last.date, first.date) >= THRESHOLDS.tagBackMinGapDays &&
      usesBefore >= THRESHOLDS.tagBackMinUses &&
      tagMean >= usual
    ) {
      tags.push({
        tagId,
        days: input.days.filter((day) => dayHas(day, has)).length,
        weeks: weeks(daysBetween(last.date, first.date)),
      });
    }
  }
  return tags.length > 0 ? [{ type: "tag-back", tags }] : [];
};
