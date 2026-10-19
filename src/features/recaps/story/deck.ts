import dayjs from "dayjs";
import { getEffect } from "../correlation";
import { addDays, daysBetween, getDayRating } from "../days";
import { indexDays } from "../day-index";
import { firstCity } from "../cards/moments";
import { getActiveTags } from "../cards/nudges";
import { getHome, peopleOn } from "../cards/summaries";
import { distanceKm } from "../places";
import { buildQuiz } from "./quiz";
import { THRESHOLDS } from "../thresholds";
import type { DateKey, RecapDay, RecapInput } from "../types";
import type {
  ComingUpSlide,
  CoverSlide,
  FirstCitySlide,
  HardPatternSlide,
  LiftedSlide,
  MadeOfSlide,
  MomentsSlide,
  PeopleSlide,
  ShareFact,
  ShareSlide,
  StoryPhoto,
  StorySlide,
  VsLastSlide,
  WeekdayHabitSlide,
} from "./types";

const isBright = (day: RecapDay) =>
  getDayRating(day) >= THRESHOLDS.storyBrightMinRating;

const isHard = (day: RecapDay) =>
  getDayRating(day) <= THRESHOLDS.storyHardMaxRating;

/** First photo of each bright day. Harder days never show a photo. */
const brightPhotos = (days: RecapDay[]): StoryPhoto[] =>
  days.flatMap((day) => {
    const photo = isBright(day)
      ? day.items.flatMap((item) => item.photos)[0]
      : undefined;
    return photo ? [{ date: day.date, photo }] : [];
  });

/** Photo of the brightest day, latest on a tie. */
const bestPhoto = (days: RecapDay[]): StoryPhoto | null => {
  const sorted = days
    .filter((day) => isBright(day))
    .sort((a, b) => getDayRating(b) - getDayRating(a));
  return brightPhotos(sorted)[0] ?? null;
};

/** Tag ids counted per check-in day, most days first. */
const tagCounts = (days: RecapDay[], tagIds: ReadonlySet<string>) => {
  const at = indexDays(days);
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const id of at(day).tags) {
      if (tagIds.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([tagId, count]) => ({ tagId, days: count }))
    .sort((a, b) => b.days - a.days);
};

/**
 * Active tags whose days do not feel heavier: the month and the 90 days
 * before it, at most 0.25 mood steps below other days. Any signal counts:
 * a few heavy days are enough to stay quiet. Celebrating slides and the
 * quiz only name these.
 */
const lightTagIds = (input: RecapInput) => {
  const from = addDays(input.period.start, -THRESHOLDS.stoodOutHistoryDays);
  const days = input.history.filter(
    (day) => day.date >= from && day.date <= input.period.end
  );
  const at = indexDays(days);
  const ids = new Set<string>();
  for (const tag of getActiveTags(input.tags)) {
    const effect = getEffect(days, (day) => at(day).tags.has(tag.id));
    if (effect.delta > -THRESHOLDS.stoodOutMinDelta) {
      ids.add(tag.id);
    }
  }
  return ids;
};

const allTagIds = (input: RecapInput) =>
  new Set(getActiveTags(input.tags).map((tag) => tag.id));

/** Every calendar day of the month, check-in or not. */
const monthDates = (input: RecapInput) =>
  Array.from(
    { length: daysBetween(input.period.start, input.period.end) + 1 },
    (_, index) => addDays(input.period.start, index)
  );

/** Days of the month before, with check-ins. */
const previousDays = (input: RecapInput) => {
  const start = dayjs(input.period.start)
    .subtract(1, "month")
    .format("YYYY-MM-DD");
  const end = addDays(input.period.start, -1);
  return {
    start,
    end,
    days: input.history.filter((day) => day.date >= start && day.date <= end),
  };
};

const cover = (input: RecapInput): CoverSlide => {
  const photos = brightPhotos(input.days);
  let variant: CoverSlide["variant"] = "pixels";
  if (photos.length >= THRESHOLDS.storyCoverGridPhotoDays) {
    variant = "photos";
  } else if (photos.length > 0) {
    variant = "photo";
  }
  const best = bestPhoto(input.days);
  return {
    type: "cover",
    variant,
    checkIns: input.days.length,
    // One photo: the brightest day's, so it fills the screen first.
    photos: variant === "photo" && best ? [best] : photos,
  };
};

const weekdayCount = (dates: DateKey[], weekday: number) =>
  dates.filter((date) => dayjs(date).day() === weekday).length;

/**
 * A light tag on 3+ of one weekday, on 75%+ of that weekday, and on at
 * most half that share of the other days. Most hits first.
 */
const weekdayHabit = (
  input: RecapInput,
  lightTags: ReadonlySet<string>
): WeekdayHabitSlide | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const at = indexDays(input.days);
  const dates = monthDates(input);
  const previous = previousDays(input);
  const previousAt = indexDays(previous.days);
  let best: WeekdayHabitSlide | null = null;
  for (const tagId of lightTags) {
    const tagDays = input.days.filter((day) => at(day).tags.has(tagId));
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const hits = tagDays.filter(
        (day) => dayjs(day.date).day() === weekday
      ).length;
      const total = weekdayCount(dates, weekday);
      const otherShare = (tagDays.length - hits) / (dates.length - total);
      if (
        hits >= THRESHOLDS.weekdayHabitMinHits &&
        hits / total >= THRESHOLDS.weekdayHabitMinShare &&
        otherShare <= (hits / total) * THRESHOLDS.weekdayHabitMaxOtherRatio &&
        (!best || hits / total > best.hits / best.total)
      ) {
        const previousDates = Array.from(
          { length: daysBetween(previous.start, previous.end) + 1 },
          (_, index) => addDays(previous.start, index)
        );
        best = {
          type: "weekday-habit",
          tagId,
          weekday,
          hits,
          total,
          previous:
            previous.days.length > 0
              ? {
                  hits: previous.days.filter(
                    (day) =>
                      dayjs(day.date).day() === weekday &&
                      previousAt(day).tags.has(tagId)
                  ).length,
                  total: weekdayCount(previousDates, weekday),
                }
              : null,
        };
      }
    }
  }
  return best;
};

/** 3+ tags on 4+ days each. Archived tags stay out. */
const madeOf = (input: RecapInput): MadeOfSlide | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const rows = tagCounts(input.days, allTagIds(input)).filter(
    (row) => row.days >= THRESHOLDS.madeOfMinDays
  );
  return rows.length >= THRESHOLDS.madeOfMinTags
    ? {
        type: "made-of",
        tagIds: rows.slice(0, THRESHOLDS.madeOfMaxRows).map((row) => row.tagId),
      }
    : null;
};

/** Tags with a medium or strong lighter effect this month, biggest first. */
const lifted = (input: RecapInput): LiftedSlide | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const at = indexDays(input.days);
  const found: LiftedSlide["rows"] = [];
  for (const tag of getActiveTags(input.tags)) {
    const effect = getEffect(input.days, (day) => at(day).tags.has(tag.id));
    if (effect.signal !== "weak" && effect.delta > 0) {
      found.push({ tagId: tag.id, days: effect.days, delta: effect.delta });
    }
  }
  const rows = found
    .sort((a, b) => b.delta - a.delta)
    .slice(0, THRESHOLDS.liftedMaxRows);
  return rows.length > 0 ? { type: "lifted", rows } : null;
};

/**
 * 2+ people with 3+ bright connected days. Shows their connected days,
 * most first. Says nothing about the person: the pixels tell the days.
 */
const people = (input: RecapInput): PeopleSlide | null => {
  if (!peopleOn(input)) {
    return null;
  }
  const at = indexDays(input.days);
  const byPerson = new Map<string, RecapDay[]>();
  for (const day of input.days) {
    for (const id of at(day).people) {
      if (input.personIds.has(id)) {
        byPerson.set(id, [...(byPerson.get(id) ?? []), day]);
      }
    }
  }
  const rows = [...byPerson.entries()]
    .filter(
      ([, days]) =>
        days.filter((day) => isBright(day)).length >=
        THRESHOLDS.storyPeopleMinBrightDays
    )
    .sort(([, a], [, b]) => b.length - a.length);
  return rows.length >= THRESHOLDS.storyPeopleMinPeople
    ? {
        type: "people",
        people: rows
          .slice(0, THRESHOLDS.storyPeopleMaxRows)
          .map(([personId, days]) => ({
            personId,
            days: days.map((day) => day.date),
          })),
      }
    : null;
};

/**
 * A tag on 2+ harder days and on under half of the other days. Any active
 * tag: the slide only says they went together. Most harder days first,
 * then the rarest on other days.
 */
const hardPattern = (input: RecapInput): HardPatternSlide | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const hard = input.days.filter((day) => isHard(day));
  const other = input.days.filter((day) => !isHard(day));
  if (hard.length === 0 || other.length === 0) {
    return null;
  }
  const at = indexDays(input.days);
  const found: { tagId: string; tagHard: number; tagOther: number }[] = [];
  for (const tagId of allTagIds(input)) {
    const tagHard = hard.filter((day) => at(day).tags.has(tagId)).length;
    const tagOther = other.filter((day) => at(day).tags.has(tagId)).length;
    if (
      tagHard >= THRESHOLDS.hardPatternMinDays &&
      tagOther / other.length < THRESHOLDS.hardPatternMaxOtherShare
    ) {
      found.push({ tagId, tagHard, tagOther });
    }
  }
  const [best] = found.sort(
    (a, b) => b.tagHard - a.tagHard || a.tagOther - b.tagOther
  );
  return best
    ? {
        type: "hard-pattern",
        ...best,
        hardDates: hard.map((day) => day.date),
        otherDays: other.length,
      }
    : null;
};

/** First city of the month, with km from home and a photo from there. */
const firstCitySlide = (input: RecapInput): FirstCitySlide | null => {
  const [card] = firstCity(input);
  if (!card || card.type !== "first-city") {
    return null;
  }
  const home = getHome(input.history.filter((day) => day.date < card.date));
  const location = input.days
    .find((day) => day.date === card.date)
    ?.items.find((item) => item.location)?.location;
  const there = input.days.filter(
    (day) =>
      day.date >= card.date &&
      day.items.some((item) => item.location?.name?.endsWith(card.city))
  );
  return {
    type: "first-city",
    city: card.city,
    date: card.date,
    km:
      home && location ? Math.round(distanceKm(home, location) / 5) * 5 : null,
    photo: bestPhoto(there),
  };
};

/** Light tags with the biggest change in days vs. the month before. */
const vsLast = (
  input: RecapInput,
  lightTags: ReadonlySet<string>
): VsLastSlide | null => {
  const previous = previousDays(input);
  if (
    !input.steps.has("tags") ||
    previous.days.length < THRESHOLDS.vsLastMinCheckIns
  ) {
    return null;
  }
  const before = new Map(
    tagCounts(previous.days, lightTags).map((row) => [row.tagId, row.days])
  );
  const now = new Map(
    tagCounts(input.days, lightTags).map((row) => [row.tagId, row.days])
  );
  const found: VsLastSlide["rows"] = [];
  for (const tagId of lightTags) {
    const days = now.get(tagId) ?? 0;
    const change = days - (before.get(tagId) ?? 0);
    if (Math.abs(change) >= THRESHOLDS.vsLastMinChange) {
      found.push({ tagId, days, change });
    }
  }
  const rows = found
    .sort((a, b) => b.change - a.change)
    .slice(0, THRESHOLDS.vsLastMaxRows);
  return rows.length > 0
    ? { type: "vs-last", previousStart: previous.start, rows }
    : null;
};

/** Weeks of the month: 1-7, 8-14, 15-21, 22 to the end. */
const monthWeeks = (input: RecapInput) =>
  [0, 7, 14, 21].map((offset) => ({
    start: addDays(input.period.start, offset),
    end:
      offset === 21
        ? input.period.end
        : addDays(input.period.start, offset + 6),
  }));

/** One bright photo per week, 3+ weeks with one. */
const moments = (input: RecapInput): MomentsSlide | null => {
  const weeks = monthWeeks(input).map((week) => ({
    ...week,
    photo: bestPhoto(
      input.days.filter((day) => day.date >= week.start && day.date <= week.end)
    ),
  }));
  return weeks.filter((week) => week.photo).length >= THRESHOLDS.momentsMinWeeks
    ? { type: "moments", weeks }
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

/** Bright photos, one per file, brightest day first. */
const sharePhotos = (input: RecapInput) => {
  const seen = new Set<string>();
  const sorted = [...input.days].sort(
    (a, b) => getDayRating(b) - getDayRating(a)
  );
  return brightPhotos(sorted).filter(({ photo }) => {
    if (seen.has(photo.fileName)) {
      return false;
    }
    seen.add(photo.fileName);
    return true;
  });
};

/**
 * Share card: up to 3 lines from the story (first city, same weekday, top
 * light tag), check-ins when nothing else. Always last.
 */
const share = (
  input: RecapInput,
  lightTags: ReadonlySet<string>,
  slides: (StorySlide | null)[]
): ShareSlide => {
  const facts: ShareFact[] = [];
  const habit = slides.find((slide) => slide?.type === "weekday-habit");
  for (const slide of slides) {
    if (slide?.type === "first-city") {
      facts.push({ kind: "city", city: slide.city });
    }
    if (slide?.type === "weekday-habit") {
      const { tagId, weekday, hits, total } = slide;
      facts.push({ kind: "weekday", tagId, weekday, hits, total });
    }
  }
  const top = tagCounts(input.days, lightTags).find(
    (row) => habit?.type !== "weekday-habit" || row.tagId !== habit.tagId
  );
  if (top) {
    facts.push({ kind: "tag", tagId: top.tagId, days: top.days });
  }
  if (facts.length === 0) {
    facts.push({ kind: "check-ins", days: input.days.length });
  }
  const photos = sharePhotos(input);
  return {
    type: "share",
    photos: photos.length >= THRESHOLDS.sharePhotos ? photos : [],
    facts: facts.slice(0, THRESHOLDS.shareMaxFacts),
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
  const lightTags = lightTagIds(input);
  const slides = [
    cover(input),
    weekdayHabit(input, lightTags),
    madeOf(input),
    buildQuiz(input, lightTags),
    lifted(input),
    people(input),
    hardPattern(input),
    firstCitySlide(input),
    vsLast(input, lightTags),
    moments(input),
    comingUp(input),
  ];
  return [...slides, share(input, lightTags, slides)].filter(
    (slide): slide is StorySlide => slide !== null
  );
};
