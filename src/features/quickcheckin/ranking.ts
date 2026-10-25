import dayjs from "dayjs";
import { RATING_MAPPING } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";

/** Days of history that count toward a suggestion. */
export const RANKING_WINDOW_DAYS = 90;

/** Days that count as recent use. */
export const RECENT_WINDOW_DAYS = 28;

type Rating = LogItem["rating"];

/** Emotion category the glance surfaces offer for each rating. */
const RATING_CATEGORY: Record<Rating, Emotion["category"]> = {
  extremely_good: "very_good",
  very_good: "very_good",
  good: "good",
  neutral: "neutral",
  bad: "bad",
  very_bad: "very_bad",
  extremely_bad: "very_bad",
};

/** Emotion category that matches a rating. */
export const getRatingCategory = (rating: Rating): Emotion["category"] =>
  RATING_CATEGORY[rating];

type TimeOfDay = "morning" | "day" | "evening" | "night";

const getTimeOfDay = (time: dayjs.Dayjs): TimeOfDay => {
  const hour = time.hour();
  if (hour >= 5 && hour < 11) {
    return "morning";
  }
  if (hour >= 11 && hour < 17) {
    return "day";
  }
  if (hour >= 17 && hour < 22) {
    return "evening";
  }
  return "night";
};

/** Person or tag offered for the Influences step. */
export interface InfluenceOption {
  kind: "person" | "tag";
  id: string;
  label: string;
  /** Tag color name, for example `blue`. `""` for people. */
  color: string;
}

interface Usage {
  atTimeOfDay: number;
  recent: number;
  ratingSum: number;
  count: number;
}

const newUsage = (): Usage => ({
  atTimeOfDay: 0,
  recent: 0,
  ratingSum: 0,
  count: 0,
});

/**
 * Suggestion score. Same time of day weighs most, mood fit breaks ties
 * between items used equally often.
 */
const score = (usage: Usage | undefined, rating: Rating): number => {
  if (!usage || usage.count === 0) {
    return 0;
  }
  const average = usage.ratingSum / usage.count;
  const moodFit = 1 - Math.abs(average - RATING_MAPPING[rating]) / 6;
  return 1 * usage.atTimeOfDay + 0.25 * usage.recent + 3 * moodFit;
};

const collectUsage = <T extends Pick<LogItem, "dateTime" | "rating">>(
  items: T[],
  now: dayjs.Dayjs,
  keysOf: (item: T) => string[]
): Map<string, Usage> => {
  const since = now.subtract(RANKING_WINDOW_DAYS, "day").valueOf();
  const recentSince = now.subtract(RECENT_WINDOW_DAYS, "day").valueOf();
  const timeOfDay = getTimeOfDay(now);
  const usage = new Map<string, Usage>();
  for (const item of items) {
    const time = dayjs(item.dateTime);
    const value = time.valueOf();
    if (value < since || value > now.valueOf()) {
      continue;
    }
    const isSameTimeOfDay = getTimeOfDay(time) === timeOfDay;
    for (const key of keysOf(item)) {
      const entry = usage.get(key) ?? newUsage();
      entry.count += 1;
      entry.ratingSum += RATING_MAPPING[item.rating];
      if (value >= recentSince) {
        entry.recent += 1;
      }
      if (isSameTimeOfDay) {
        entry.atTimeOfDay += 1;
      }
      usage.set(key, entry);
    }
  }
  return usage;
};

const influenceKey = (kind: InfluenceOption["kind"], id: string) =>
  `${kind}:${id}`;

/**
 * People and tags in one list, best guess first.
 *
 * - Archived items never show.
 * - Score: uses at this time of day, uses in the last 28 days, and how close
 *   the item's average mood is to `rating`.
 * - Ties sort by label, then id, so the order never jumps between renders.
 */
export const rankInfluences = ({
  items,
  people,
  tags,
  rating,
  now = dayjs(),
}: {
  items: Pick<LogItem, "dateTime" | "rating" | "people" | "tags">[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; color?: string; isArchived?: boolean }[];
  rating: Rating;
  now?: dayjs.Dayjs;
}): InfluenceOption[] => {
  const usage = collectUsage(items, now, (item) => [
    ...item.people.map((person) => influenceKey("person", person.id)),
    ...item.tags.map((tag) => influenceKey("tag", tag.id)),
  ]);
  const options: InfluenceOption[] = [];
  for (const person of people) {
    if (!person.isArchived) {
      options.push({
        kind: "person",
        id: person.id,
        label: person.name,
        color: "",
      });
    }
  }
  for (const tag of tags) {
    if (!tag.isArchived) {
      options.push({
        kind: "tag",
        id: tag.id,
        label: tag.title,
        color: tag.color ?? "",
      });
    }
  }
  const scores = new Map(
    options.map((option) => [
      option,
      score(usage.get(influenceKey(option.kind, option.id)), rating),
    ])
  );
  return options.sort(
    (a, b) =>
      (scores.get(b) ?? 0) - (scores.get(a) ?? 0) ||
      a.label.localeCompare(b.label) ||
      a.id.localeCompare(b.id)
  );
};

/**
 * Basic emotions of the rating's category, best guess first. Same score as
 * {@link rankInfluences}; ties keep the order of `emotions`.
 */
export const rankEmotions = ({
  items,
  emotions,
  rating,
  now = dayjs(),
}: {
  items: Pick<LogItem, "dateTime" | "rating" | "emotions">[];
  emotions: Pick<Emotion, "key" | "category" | "mode" | "disabled">[];
  rating: Rating;
  now?: dayjs.Dayjs;
}): Emotion["key"][] => {
  const category = getRatingCategory(rating);
  const usage = collectUsage(items, now, (item) => item.emotions);
  const candidates = emotions.filter(
    (emotion) =>
      emotion.mode === "basic" &&
      emotion.disabled !== true &&
      emotion.category === category
  );
  const scores = new Map(
    candidates.map((emotion) => [
      emotion.key,
      score(usage.get(emotion.key), rating),
    ])
  );
  return candidates
    .map((emotion, index) => ({ key: emotion.key, index }))
    .sort(
      (a, b) =>
        (scores.get(b.key) ?? 0) - (scores.get(a.key) ?? 0) || a.index - b.index
    )
    .map(({ key }) => key);
};

/** Longest label on a glance surface. Longer labels end with "…". */
export const GLANCE_LABEL_LENGTH = 12;

/**
 * Short label for a glance surface. People who share a first name get their
 * last initial ("Anna K.", "Anna M."). Labels over
 * {@link GLANCE_LABEL_LENGTH} characters are cut.
 */
export const getGlanceLabels = (options: InfluenceOption[]): string[] => {
  const firstNames = new Map<string, number>();
  const parts = options.map((option) =>
    option.kind === "person" ? option.label.trim().split(/\s+/u) : []
  );
  for (const words of parts) {
    if (words.length > 0) {
      firstNames.set(words[0], (firstNames.get(words[0]) ?? 0) + 1);
    }
  }
  return options.map((option, index) => {
    const words = parts[index];
    let label = option.label.trim();
    if (words.length > 0) {
      const isShared = (firstNames.get(words[0]) ?? 0) > 1;
      const initial = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
      label = isShared && initial ? `${words[0]} ${initial}.` : words[0];
    }
    return label.length > GLANCE_LABEL_LENGTH
      ? `${label.slice(0, GLANCE_LABEL_LENGTH - 1)}…`
      : label;
  });
};
