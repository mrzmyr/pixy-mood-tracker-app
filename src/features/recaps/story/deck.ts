import dayjs from "dayjs";
import { getEffect } from "../correlation";
import { addDays, daysBetween, getDayRating } from "../days";
import { indexDays } from "../day-index";
import { getActiveTags } from "../cards/nudges";
import { peopleOn } from "../cards/summaries";
import { THRESHOLDS } from "../thresholds";
import type { DateKey, RecapDay, RecapInput } from "../types";
import type {
  ComingUpSlide,
  CoverSlide,
  NegativeTagsSlide,
  OrbitSlide,
  PositiveTagsSlide,
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
 * 3+ people connected on 2+ days each, most days first. Any connection
 * counts: the slide shows how often, never how it felt.
 */
const orbit = (input: RecapInput): OrbitSlide | null => {
  if (!peopleOn(input)) {
    return null;
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
  const rows = [...counts.entries()]
    .filter(([, days]) => days >= THRESHOLDS.storyOrbitMinDays)
    .sort(([, a], [, b]) => b - a)
    .slice(0, THRESHOLDS.storyOrbitMaxPeople);
  return rows.length >= THRESHOLDS.storyOrbitMinPeople
    ? {
        type: "orbit",
        people: rows.map(([personId, days]) => ({ personId, days })),
      }
    : null;
};

/**
 * Days left in the year after today, and days without a check-in since
 * January 1 or the first entry. Only while the month's year is still on.
 */
const comingUp = (input: RecapInput): ComingUpSlide | null => {
  const year = dayjs(input.period.start).year();
  const yearEnd = `${year}-12-31`;
  if (dayjs(input.today).year() !== year || input.today >= yearEnd) {
    return null;
  }
  const [, from] = [
    `${year}-01-01`,
    input.firstEntryDate ?? input.today,
  ].sort();
  const logged = new Set(input.history.map((day) => day.date));
  let missed = 0;
  for (let date = from; date <= input.today; date = addDays(date, 1)) {
    missed += logged.has(date) ? 0 : 1;
  }
  return {
    type: "coming-up",
    year,
    left: daysBetween(input.today, yearEnd),
    missed,
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
 * Month story slides in deck order. Each slot skips when its rule fails,
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
    positiveTags(input),
    negativeTags(input),
    orbit(input),
    comingUp(input),
  ];
  return [...slides, share(input)].filter(
    (slide): slide is StorySlide => slide !== null
  );
};

/** Weeks from the story week to today's week: 0 for the current week. */
const weeksSince = (start: DateKey, today: DateKey) =>
  Math.floor(daysBetween(start, today) / 7);

/**
 * Week story slides in deck order: intro on the sky, cover, tags that felt
 * lighter and heavier, orbit, and the closing card. Each slot skips when
 * its rule fails. `null` for other periods, weeks more than 2 weeks back
 * or ahead, and weeks with fewer than 4 check-in days.
 */
export const buildWeekStory = (input: RecapInput): StorySlide[] | null => {
  const age = weeksSince(input.period.start, input.today);
  if (
    input.period.kind !== "week" ||
    age < 0 ||
    age > THRESHOLDS.weekStoryMaxWeeksBack ||
    input.days.length < THRESHOLDS.weekStoryMinCheckIns
  ) {
    return null;
  }
  const slides: (StorySlide | null)[] = [
    { type: "intro" },
    cover(input),
    positiveTags(input),
    negativeTags(input),
    orbit(input),
  ];
  return [...slides, share(input)].filter(
    (slide): slide is StorySlide => slide !== null
  );
};
