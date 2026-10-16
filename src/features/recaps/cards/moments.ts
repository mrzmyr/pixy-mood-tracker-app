import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import {
  addDays,
  dayHas,
  daysBetween,
  getDaySleep,
  getMeanRating,
} from "../days";
import { THRESHOLDS } from "../thresholds";
import type { MomentCard, RecapDay, RecapInput } from "../types";

const CATEGORY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion.category])
);
const GOOD = new Set(["very_good", "good"]);
const HARD = new Set(["bad", "very_bad"]);

const isGoodEmotion = (key: string) => GOOD.has(CATEGORY.get(key) ?? "");
const isHardEmotion = (key: string) => HARD.has(CATEGORY.get(key) ?? "");

const before = ({ history, period }: RecapInput) =>
  history.filter((day) => day.date < period.start);

const lastWith = (days: RecapDay[], test: (item: LogItem) => boolean) =>
  days.findLast((day) => dayHas(day, test)) ?? null;

const firstWith = (days: RecapDay[], test: (item: LogItem) => boolean) =>
  days.find((day) => dayHas(day, test)) ?? null;

const weeks = (days: number) => Math.round(days / 7);

/** Good emotion, first time in 30+ days. The longest gap wins. */
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
  let best: { emotion: string; lastDate: string; gap: number } | null = null;
  for (const emotion of keys) {
    const has = (item: LogItem) => item.emotions.some((key) => key === emotion);
    const first = firstWith(input.days, has);
    const last = lastWith(earlier, has);
    if (first && last) {
      const gap = daysBetween(last.date, first.date);
      if (
        gap >= THRESHOLDS.emotionAgainMinGapDays &&
        (!best || gap > best.gap)
      ) {
        best = { emotion, lastDate: last.date, gap };
      }
    }
  }
  return best
    ? [
        {
          type: "emotion-again",
          emotion: best.emotion,
          lastDate: best.lastDate,
        },
      ]
    : [];
};

/** The week is heavier than usual: no celebrations then. */
const isHeavierWeek = (input: RecapInput) => {
  const earlier = before(input);
  const usual = getMeanRating(earlier);
  const week = getMeanRating(input.days);
  return (
    earlier.length >= THRESHOLDS.usualMinDays &&
    usual !== null &&
    week !== null &&
    week < usual - THRESHOLDS.heavierWeekDrop
  );
};

/**
 * Hard emotion on 5+ days in the 2 months before, none in the last 3
 * weeks, with enough check-ins to tell. Not in a heavier week.
 */
export const emotionAbsent = (input: RecapInput): MomentCard[] => {
  if (!input.steps.has("emotions") || isHeavierWeek(input)) {
    return [];
  }
  // A current week ends in the future: count only days that happened.
  const end = input.today < input.period.end ? input.today : input.period.end;
  const since = addDays(end, 1 - THRESHOLDS.emotionAbsentDays);
  const from = addDays(since, -THRESHOLDS.emotionAbsentBeforeDays);
  const recent = input.history.filter(
    (day) => day.date >= since && day.date <= end
  );
  const earlier = input.history.filter(
    (day) => day.date >= from && day.date < since
  );
  if (recent.length < THRESHOLDS.emotionAbsentMinCheckIns) {
    return [];
  }
  const counts = new Map<string, number>();
  for (const day of earlier) {
    const keys = new Set(
      day.items.flatMap((item) => item.emotions.filter(isHardEmotion))
    );
    for (const key of keys) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const [absent] = [...counts.entries()]
    .filter(
      ([emotion, count]) =>
        count >= THRESHOLDS.emotionAbsentMinBefore &&
        !recent.some((day) =>
          dayHas(day, (item) => item.emotions.some((key) => key === emotion))
        )
    )
    .sort(([, a], [, b]) => b - a);
  return absent
    ? [
        {
          type: "emotion-absent",
          emotion: absent[0],
          countBefore: absent[1],
        },
      ]
    : [];
};

const connectedDaysIn = (days: RecapDay[], personId: string) =>
  days.filter((day) =>
    dayHas(day, (item) => item.people.some((person) => person.id === personId))
  );

/**
 * One card per person connected in the period: back after 28+ days, first
 * entry ever, or a milestone of connected days in the calendar year. Back
 * wins over a milestone, a milestone over new.
 */
export const personMoments = (input: RecapInput): MomentCard[] => {
  if (!input.steps.has("people") || !input.availableSteps.has("people")) {
    return [];
  }
  const earlier = before(input);
  const ids = new Set(
    input.days.flatMap((day) =>
      day.items.flatMap((item) => item.people.map((person) => person.id))
    )
  );
  const year = Number(input.period.end.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const cards: MomentCard[] = [];
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
      cards.push({
        type: "person-back",
        personId,
        lastDate: lastBefore.date,
        weeks: weeks(gap),
      });
    } else if (milestone !== undefined) {
      cards.push({ type: "person-milestone", personId, days: milestone, year });
    } else if (!lastBefore && earlier.length >= THRESHOLDS.newMinHistoryDays) {
      cards.push({ type: "person-new", personId, firstDate: first.date });
    }
  }
  return cards;
};

/** "District, City" or "City". `null` names never count. */
const parsePlace = (name: string | null | undefined) => {
  if (!name) {
    return null;
  }
  const parts = name.split(", ");
  const [first] = parts;
  return parts.length > 1
    ? { district: first, city: parts.at(-1) ?? first }
    : { district: null, city: first };
};

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometers. */
const distanceKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
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
 * Tag back after 21+ days, used on 8+ days before, and days with it feel
 * at least as good as an average day. Tags carry no meaning, so a heavy
 * tag never gets a welcome back.
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
  const cards: MomentCard[] = [];
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
      cards.push({
        type: "tag-back",
        tagId,
        days: input.days.filter((day) => dayHas(day, has)).length,
        weeks: weeks(daysBetween(last.date, first.date)),
      });
    }
  }
  return cards;
};

const isGoodNight = (day: RecapDay) => {
  const sleep = getDaySleep(day);
  return sleep !== null && sleep >= 3;
};

const isRoughNight = (day: RecapDay) => {
  const sleep = getDaySleep(day);
  return sleep !== null && sleep <= 1;
};

/** Longest run of calendar days in a row that pass `test`. */
const longestRun = (days: RecapDay[], test: (day: RecapDay) => boolean) => {
  let best: string[] = [];
  let current: string[] = [];
  for (const day of days) {
    const follows =
      current.length > 0 && daysBetween(current.at(-1) ?? "", day.date) === 1;
    if (!test(day)) {
      current = [];
    } else if (follows) {
      current = [...current, day.date];
    } else {
      current = [day.date];
    }
    if (current.length > best.length) {
      best = current;
    }
  }
  return best;
};

/**
 * Week only, sleep step on. 3+ good nights in a row after 2+ rough nights
 * the week before, or 3+ rough nights in a row after a steadier week: one
 * with 3+ nights of sleep data and at most 1 rough night.
 */
export const sleepMoments = (input: RecapInput): MomentCard[] => {
  if (!input.steps.has("sleep")) {
    return [];
  }
  const weekBefore = input.history.filter(
    (day) =>
      day.date >= addDays(input.period.start, -7) &&
      day.date < input.period.start
  );
  const roughBefore = weekBefore.filter(isRoughNight).length;
  const sleptBefore = weekBefore.filter((day) => getDaySleep(day) !== null);
  const good = longestRun(input.days, isGoodNight);
  const rough = longestRun(input.days, isRoughNight);
  if (
    rough.length >= THRESHOLDS.sleepRunNights &&
    sleptBefore.length >= THRESHOLDS.sleepRunNights &&
    roughBefore <= THRESHOLDS.sleepRoughMaxRoughBefore
  ) {
    return [{ type: "sleep-rough", nights: rough }];
  }
  if (
    good.length >= THRESHOLDS.sleepRunNights &&
    roughBefore >= THRESHOLDS.sleepTurnaroundMinRoughBefore
  ) {
    return [{ type: "sleep-turnaround", nights: good }];
  }
  return [];
};
