import type { LogItem } from "../useLogs";
import { RATING_KEYS } from "@/constants/Ratings";
import { getLogDays } from "@/lib/utils";

const MOOD_GROUPS = ["negative", "neutral", "positive"] as const;

/**
 * Mood balance for the statistics mood average card.
 *
 * `ratingHighestKey` is counted over day averages; `distribution` counts
 * single entries, ordered worst to best.
 */
export interface MoodAvgData {
  ratingHighestKey: (typeof MOOD_GROUPS)[number];
  ratingHighestPercentage: number;
  distribution: {
    key: LogItem["rating"];
    count: number;
  }[];
  itemsCount: number;
}

/** Empty state before statistics load. */
export const defaultMoodAvgData: MoodAvgData = {
  ratingHighestKey: "neutral",
  ratingHighestPercentage: 0,
  itemsCount: 0,
  distribution: [],
};

/**
 * Compute the dominant mood group and rating distribution.
 *
 * Ties go to the more positive group. `ratingHighestPercentage` is `NaN`
 * when `items` is empty.
 */
export const getMoodAvgData = (items: LogItem[]): MoodAvgData => {
  const keys: LogItem["rating"][] = [...RATING_KEYS].reverse();

  const moods = {
    negative: 0,
    neutral: 0,
    positive: 0,
  };

  const avgMoods = getLogDays(items);

  for (const item of avgMoods) {
    if (["bad", "very_bad", "extremely_bad"].includes(item.ratingAvg)) {
      moods.negative += 1;
    }

    if (["good", "very_good", "extremely_good"].includes(item.ratingAvg)) {
      moods.positive += 1;
    }

    if (["neutral"].includes(item.ratingAvg)) {
      moods.neutral += 1;
    }
  }

  const rating_total = moods.negative + moods.neutral + moods.positive;

  const rating_distribution = keys.map((key) => {
    const count = items.filter((item) => item.rating === key).length;
    return {
      key,
      count,
    };
  });

  const ratings_total = rating_distribution.reduce(
    (acc, item) => acc + item.count,
    0
  );

  const [firstMoodGroup, ...otherMoodGroups] = MOOD_GROUPS;
  let ratingHighestKey: (typeof MOOD_GROUPS)[number] = firstMoodGroup;
  for (const moodGroup of otherMoodGroups) {
    if (moods[moodGroup] >= moods[ratingHighestKey]) {
      ratingHighestKey = moodGroup;
    }
  }

  const percentage = Math.round((moods[ratingHighestKey] / rating_total) * 100);

  return {
    ratingHighestKey,
    ratingHighestPercentage: percentage,
    distribution: rating_distribution,
    itemsCount: ratings_total,
  };
};
