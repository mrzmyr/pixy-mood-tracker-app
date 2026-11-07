import dayjs from "dayjs";
import { getEffect } from "../correlation";
import { RATING_MAPPING } from "@/constants/ratings";
import { daysBetween, getDayRating } from "../days";
import { indexDays } from "../day-index";
import { parsePlace } from "../places";
import { getActiveTags } from "../cards/nudges";
import { getPlaceVisits, peopleOn } from "../cards/summaries";
import { THRESHOLDS } from "../thresholds";
import { sleep } from "./sleep";
import type { DateKey, RecapDay, RecapInput } from "../types";
import type {
  BestDaySlide,
  ComingUpSlide,
  CoverSlide,
  NegativeTagsSlide,
  NewPeopleSlide,
  OrbitSlide,
  PeopleQuizSlide,
  PlacesSlide,
  PositiveTagsSlide,
  QuizInsight,
  ShareSlide,
  StoryPhoto,
  StorySlide,
  TagEffectRow,
} from "./types";

const isBright = (day: RecapDay) =>
  getDayRating(day) >= THRESHOLDS.storyBrightMinRating;

/** First photo of each bright day. Harder days never show a photo. */
const brightPhotos = (days: RecapDay[]): StoryPhoto[] =>
  days.flatMap((day) => {
    const photo = isBright(day)
      ? day.items.flatMap((item) => item.photos)[0]
      : undefined;
    return photo ? [{ date: day.date, photo }] : [];
  });

/** Bright photos, one per file, brightest day first. */
const uniqueBrightPhotos = (days: RecapDay[]) => {
  const seen = new Set<string>();
  const sorted = [...days].sort((a, b) => getDayRating(b) - getDayRating(a));
  return brightPhotos(sorted).filter(({ photo }) => {
    if (seen.has(photo.fileName)) {
      return false;
    }
    seen.add(photo.fileName);
    return true;
  });
};

/** Check-ins over the pixel grid. Bright days with a photo show it. */
const cover = (input: RecapInput): CoverSlide => ({
  type: "cover",
  checkIns: input.days.length,
  photos: brightPhotos(input.days),
});

const emotionCount = (day: RecapDay) =>
  new Set(day.items.flatMap((item) => item.emotions)).size;

const photoCount = (day: RecapDay) =>
  day.items.reduce((sum, item) => sum + item.photos.length, 0);

/**
 * Day with the highest mean rating, only above neutral. Ties: more
 * emotions, then more photos, then more entries, then the earlier day.
 */
export const bestDay = (input: RecapInput): BestDaySlide | null => {
  const [best] = input.days
    .filter((day) => getDayRating(day) > RATING_MAPPING.neutral)
    .sort(
      (a, b) =>
        getDayRating(b) - getDayRating(a) ||
        emotionCount(b) - emotionCount(a) ||
        photoCount(b) - photoCount(a) ||
        b.items.length - a.items.length
    );
  return best ? { type: "best-day", date: best.date } : null;
};

/**
 * Days away and at home on the cover's calendar. `null` with location off
 * or without a trip.
 */
const places = (input: RecapInput): PlacesSlide | null => {
  const visits = getPlaceVisits(input);
  if (!visits || visits.trips.length === 0) {
    return null;
  }
  const { home } = visits;
  const trips = visits.trips.map((trip) => ({
    city: trip.city,
    start: trip.start,
    end: trip.end,
    dates: input.days.flatMap((day) =>
      day.date >= trip.start && day.date <= trip.end ? [day.date] : []
    ),
  }));
  const away = new Set(trips.flatMap((trip) => trip.dates));
  const homeDays = input.days.filter(
    (day) =>
      !away.has(day.date) &&
      day.items.some(
        (item) => parsePlace(item.location?.name)?.city === home.city
      )
  ).length;
  return {
    type: "places",
    home: home.city,
    trips,
    awayDays: away.size,
    homeDays,
  };
};

/**
 * Active tags with a medium or strong mood effect in the period, biggest
 * first: lighter days for `positive`, heavier days for `negative`.
 */
const tagEffects = (
  input: RecapInput,
  direction: "positive" | "negative"
): TagEffectRow[] => {
  if (!input.steps.has("tags")) {
    return [];
  }
  const sign = direction === "positive" ? 1 : -1;
  const at = indexDays(input.days);
  const found: TagEffectRow[] = [];
  for (const tag of getActiveTags(input.tags)) {
    const effect = getEffect(input.days, (day) => at(day).tags.has(tag.id));
    if (effect.signal !== "weak" && effect.delta * sign > 0) {
      found.push({ tagId: tag.id, days: effect.days, delta: effect.delta });
    }
  }
  return found
    .sort((a, b) => (b.delta - a.delta) * sign)
    .slice(0, THRESHOLDS.storyTagEffectMaxRows);
};

const positiveTags = (input: RecapInput): PositiveTagsSlide | null => {
  const rows = tagEffects(input, "positive");
  return rows.length > 0 ? { type: "positive-tags", rows } : null;
};

const negativeTags = (input: RecapInput): NegativeTagsSlide | null => {
  const rows = tagEffects(input, "negative");
  return rows.length > 0 ? { type: "negative-tags", rows } : null;
};

/**
 * People with 2+ connected days, most days first. Any connection counts:
 * slides show how often, never how it felt.
 */
const connectedPeople = (input: RecapInput) => {
  if (!peopleOn(input)) {
    return [];
  }
  const at = indexDays(input.days);
  const counts = new Map<string, number>();
  for (const day of input.days) {
    for (const id of at(day).people) {
      if (input.personIds.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, days]) => days >= THRESHOLDS.storyOrbitMinDays)
    .sort(([, a], [, b]) => b - a)
    .map(([personId, days]) => ({ personId, days }));
};

/** 3+ connected people, most days first. */
const orbit = (input: RecapInput): OrbitSlide | null => {
  const people = connectedPeople(input).slice(
    0,
    THRESHOLDS.storyOrbitMaxPeople
  );
  return people.length >= THRESHOLDS.storyOrbitMinPeople
    ? { type: "orbit", people }
    : null;
};

/** Stable number from 0 to 1 for `text`, so a month keeps its order. */
const hash = (text: string) => {
  let value = 7;
  for (const char of text) {
    value = (value * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return value / 1_000_003;
};

/**
 * Key on the most of `personDays` that is no everyday thing: on at most
 * `storyQuizInsightMaxMonthShare` of the month and more common on
 * `personDays` than across the month. `null` below `minDays`.
 */
const standout = (
  input: RecapInput,
  personDays: RecapDay[],
  keysOf: (day: RecapDay) => Iterable<string>,
  minDays: number
) => {
  const count = (days: RecapDay[]) => {
    const counts = new Map<string, number>();
    for (const day of days) {
      for (const key of new Set(keysOf(day))) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  };
  const inMonth = count(input.days);
  let best: { key: string; days: number } | null = null;
  for (const [key, days] of count(personDays)) {
    const monthShare = (inMonth.get(key) ?? 0) / input.days.length;
    const isStandout =
      days >= minDays &&
      monthShare <= THRESHOLDS.storyQuizInsightMaxMonthShare &&
      days / personDays.length >= monthShare;
    if (isStandout && (!best || days > best.days)) {
      best = { key, days };
    }
  }
  return best;
};

/**
 * What stood out on the days connected with `personId`: a tag first, else
 * a city. `null` when nothing stands out.
 */
const quizInsight = (
  input: RecapInput,
  personId: string
): QuizInsight | null => {
  const at = indexDays(input.days);
  const personDays = input.days.filter((day) => at(day).people.has(personId));
  if (input.steps.has("tags")) {
    const active = new Set(getActiveTags(input.tags).map((tag) => tag.id));
    const tag = standout(
      input,
      personDays,
      (day) => [...at(day).tags].filter((id) => active.has(id)),
      THRESHOLDS.storyQuizInsightMinTagDays
    );
    if (tag) {
      return { kind: "tag", tagId: tag.key, days: tag.days };
    }
  }
  if (input.locationEnabled) {
    const city = standout(
      input,
      personDays,
      (day) =>
        [...at(day).places].flatMap((name) => parsePlace(name)?.city ?? []),
      THRESHOLDS.storyQuizInsightMinPlaceDays
    );
    if (city) {
      return { kind: "place", city: city.key, days: city.days };
    }
  }
  return null;
};

/**
 * The 3 or 4 most connected people as tiles, in a stable shuffled order.
 * Needs a clear winner: no quiz on a tie for the most days.
 */
const peopleQuiz = (input: RecapInput): PeopleQuizSlide | null => {
  const people = connectedPeople(input).slice(0, 4);
  const [first, second] = people;
  if (
    people.length < THRESHOLDS.storyOrbitMinPeople ||
    !first ||
    !second ||
    first.days === second.days
  ) {
    return null;
  }
  const seed = input.period.start;
  return {
    type: "people-quiz",
    people: [...people].sort(
      (a, b) => hash(seed + a.personId) - hash(seed + b.personId)
    ),
    answer: first.personId,
    insight: quizInsight(input, first.personId),
  };
};

/**
 * People connected for the first time ever in the period, in the order
 * they arrived. Needs 15+ earlier check-in days, so a first month never
 * calls everyone new. Any connection counts: never how it felt.
 */
const newPeople = (input: RecapInput): NewPeopleSlide | null => {
  if (!peopleOn(input)) {
    return null;
  }
  const at = indexDays(input.history);
  const before = input.history.filter((day) => day.date < input.period.start);
  if (before.length < THRESHOLDS.newMinHistoryDays) {
    return null;
  }
  const known = new Set(before.flatMap((day) => [...at(day).people]));
  const found = new Map<string, DateKey>();
  for (const day of input.days) {
    for (const personId of at(day).people) {
      if (
        input.personIds.has(personId) &&
        !known.has(personId) &&
        !found.has(personId)
      ) {
        found.set(personId, day.date);
      }
    }
  }
  return found.size > 0
    ? {
        type: "new-people",
        people: [...found].map(([personId, firstDate]) => ({
          personId,
          firstDate,
        })),
      }
    : null;
};

/** Days left in the year after today. Only while the month's year is still on. */
const comingUp = (input: RecapInput): ComingUpSlide | null => {
  const year = dayjs(input.period.start).year();
  const yearEnd = `${year}-12-31`;
  if (dayjs(input.today).year() !== year || input.today >= yearEnd) {
    return null;
  }
  return {
    type: "coming-up",
    year,
    left: daysBetween(input.today, yearEnd),
  };
};

/** Share card with 3+ bright photo days' photos, else none. Always last. */
const share = (input: RecapInput): ShareSlide => {
  const photos = uniqueBrightPhotos(input.days);
  return {
    type: "share",
    photos: photos.length >= THRESHOLDS.sharePhotos ? photos : [],
  };
};

/**
 * Months from the story month to today's month: 0 for the current month,
 * negative for future months.
 */
const monthsSince = (start: DateKey, today: DateKey) =>
  dayjs(today).startOf("month").diff(dayjs(start).startOf("month"), "month");

/**
 * Month story slides in deck order: cover, days away and at home, tags,
 * orbit, coming up, share. Each slot skips when its rule fails,
 * so the deck never pads. `null` for other periods, months outside the
 * current month and the 3 before it, and months with fewer than 10
 * check-in days. The current month gets a story from its 10th check-in.
 */
export const buildMonthStory = (input: RecapInput): StorySlide[] | null => {
  const age = monthsSince(input.period.start, input.today);
  if (
    input.period.kind !== "month" ||
    age < 0 ||
    age > THRESHOLDS.storyMaxMonthsBack ||
    input.days.length < THRESHOLDS.storyMinCheckIns
  ) {
    return null;
  }
  const slides: (StorySlide | null)[] = [
    cover(input),
    places(input),
    bestDay(input),
    positiveTags(input),
    negativeTags(input),
    sleep(input),
    peopleQuiz(input),
    orbit(input),
    newPeople(input),
    comingUp(input),
  ];
  return [...slides, share(input)].filter(
    (slide): slide is StorySlide => slide !== null
  );
};
