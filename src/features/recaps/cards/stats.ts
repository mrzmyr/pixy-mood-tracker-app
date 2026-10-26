import dayjs from "dayjs";
import { RATING_KEYS } from "@/constants/ratings";
import { getAverageMood } from "@/features/logs";
import { addDays, daysBetween, getDayRating, getDaySleep } from "../days";
import { fits, indexDays } from "../day-index";
import { THRESHOLDS } from "../thresholds";
import type {
  DateKey,
  RatingCount,
  RecapDay,
  RecapInput,
  SummaryCard,
} from "../types";
import { sleepMoments } from "./moments";
import { getActiveTags } from "./nudges";
import { stoodOut } from "./patterns";

/** Every day of the period up to today, oldest first. */
const getPeriodDates = (input: RecapInput): DateKey[] => {
  const last = input.today < input.period.end ? input.today : input.period.end;
  const count = daysBetween(input.period.start, last) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    addDays(input.period.start, index)
  );
};

/** Day mood rounded to a rating step, as the calendar colors the day. */
const roundedRating = (day: RecapDay) => Math.round(getDayRating(day));

/** Mean mood of each day of the period, gaps as `null`. */
export const moodChart = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "mood-chart")) {
    return [];
  }
  if (input.days.length < THRESHOLDS.moodChartMinDays) {
    return [];
  }
  const byDate = new Map(input.days.map((day) => [day.date, day]));
  return [
    {
      type: "mood-chart",
      days: getPeriodDates(input).map((date) => {
        const day = byDate.get(date);
        return { date, rating: day ? getDayRating(day) : null };
      }),
    },
  ];
};

/**
 * Days per rounded mean mood, worst to best, and the share of days at good
 * or better.
 */
export const moodCount = (input: RecapInput): SummaryCard[] => {
  if (
    !fits(input, "mood-count") ||
    input.days.length < THRESHOLDS.moodCountMinDays
  ) {
    return [];
  }
  const counts = new Map<RatingCount["rating"], number>();
  for (const day of input.days) {
    const rating = getAverageMood(day.items);
    if (rating) {
      counts.set(rating, (counts.get(rating) ?? 0) + 1);
    }
  }
  const rows = [...RATING_KEYS]
    .reverse()
    .map((rating) => ({ rating, days: counts.get(rating) ?? 0 }));
  const good = input.days.filter(
    (day) => roundedRating(day) >= THRESHOLDS.moodDaysGoodMinRating
  ).length;
  return [
    {
      type: "mood-count",
      counts: rows,
      goodShare: good / input.days.length,
    },
  ];
};

/**
 * Good days (rounded mean good or better) and harder days (bad or worse),
 * each from 2 days on. Harder days never show their rating.
 */
export const moodDays = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "mood-days")) {
    return [];
  }
  const good = input.days.flatMap((day) =>
    roundedRating(day) >= THRESHOLDS.moodDaysGoodMinRating ? [day.date] : []
  );
  const hard = input.days.flatMap((day) =>
    roundedRating(day) <= THRESHOLDS.moodDaysHardMaxRating ? [day.date] : []
  );
  const cards: SummaryCard[] = [];
  if (good.length >= THRESHOLDS.moodDaysMin) {
    cards.push({ type: "mood-days", mode: "good", dates: good });
  }
  if (hard.length >= THRESHOLDS.moodDaysMin) {
    cards.push({ type: "mood-days", mode: "hard", dates: hard });
  }
  return cards;
};

/**
 * Sleep of each night of the period. Weeks with a sleep moment card skip
 * it, so the nights never show twice.
 */
export const sleepChart = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "sleep-chart") || !input.steps.has("sleep")) {
    return [];
  }
  const isWeek = input.period.kind === "week";
  if (isWeek && sleepMoments(input).length > 0) {
    return [];
  }
  const byDate = new Map(input.days.map((day) => [day.date, day]));
  const nights = getPeriodDates(input).map((date) => {
    const day = byDate.get(date);
    return { date, sleep: day ? getDaySleep(day) : null };
  });
  const slept = nights.filter((night) => night.sleep !== null).length;
  const min = isWeek
    ? THRESHOLDS.sleepChartMinNightsWeek
    : THRESHOLDS.sleepChartMinNightsMonth;
  return slept >= min ? [{ type: "sleep-chart", nights }] : [];
};

/** Days per active tag in the period, most first. */
const countTags = (input: RecapInput) => {
  const active = new Set(getActiveTags(input.tags).map((tag) => tag.id));
  const at = indexDays(input.days);
  const counts = new Map<string, DateKey[]>();
  for (const day of input.days) {
    for (const id of at(day).tags) {
      if (active.has(id)) {
        counts.set(id, [...(counts.get(id) ?? []), day.date]);
      }
    }
  }
  return [...counts.entries()]
    .map(([tagId, dates]) => ({ tagId, dates }))
    .sort((a, b) => b.dates.length - a.dates.length);
};

/** Most used tags of the period by days, 3+ different ones. */
export const tags = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "tags") || !input.steps.has("tags")) {
    return [];
  }
  const counts = countTags(input);
  return counts.length >= THRESHOLDS.tagsMinDifferent
    ? [
        {
          type: "tags",
          counts: counts
            .slice(0, THRESHOLDS.tagsMaxRows)
            .map(({ tagId, dates }) => ({ tagId, days: dates.length })),
        },
      ]
    : [];
};

/**
 * Tags on many days of the period, one card each with their days on the
 * calendar. Weeks skip tags that already stood out.
 */
export const tagDays = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "tag-days") || !input.steps.has("tags")) {
    return [];
  }
  const isWeek = input.period.kind === "week";
  const min = isWeek ? THRESHOLDS.tagDaysMinWeek : THRESHOLDS.tagDaysMinMonth;
  const shown = new Set(
    isWeek
      ? stoodOut(input).flatMap((card) =>
          card.type === "stood-out" ? [card.tagId] : []
        )
      : []
  );
  return countTags(input)
    .filter(({ tagId, dates }) => dates.length >= min && !shown.has(tagId))
    .slice(0, THRESHOLDS.tagDaysMaxCards)
    .map(({ tagId, dates }) => ({ type: "tag-days", tagId, dates }));
};

/** The year as pixels, from 30 check-in days on. */
export const yearPixels = (input: RecapInput): SummaryCard[] =>
  fits(input, "year-pixels") &&
  input.days.length >= THRESHOLDS.yearPixelsMinDays
    ? [{ type: "year-pixels", days: input.days.length }]
    : [];

/**
 * Best and hardest month of the year by mean day mood. Months need 7
 * check-in days to rank; a single ranked month has no hardest month.
 */
export const bestMonth = (input: RecapInput): SummaryCard[] => {
  if (!fits(input, "best-month")) {
    return [];
  }
  const byMonth = new Map<DateKey, RecapDay[]>();
  for (const day of input.days) {
    const month = dayjs(day.date).startOf("month").format("YYYY-MM-DD");
    byMonth.set(month, [...(byMonth.get(month) ?? []), day]);
  }
  const ranked = [...byMonth.entries()]
    .flatMap(([month, days]) =>
      days.length >= THRESHOLDS.bestMonthMinDays
        ? [
            {
              month,
              mean:
                days.reduce((sum, day) => sum + getDayRating(day), 0) /
                days.length,
            },
          ]
        : []
    )
    .sort((a, b) => b.mean - a.mean || a.month.localeCompare(b.month));
  const [best] = ranked;
  if (!best) {
    return [];
  }
  const hardest = ranked.length > 1 ? ranked.at(-1) : undefined;
  return [
    {
      type: "best-month",
      best: best.month,
      hardest: hardest ? hardest.month : null,
    },
  ];
};
