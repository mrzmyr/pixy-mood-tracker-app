import type { LogItem } from "../useLogs";
import { RATING_KEYS } from "@/constants/Ratings";
import { getLogDays } from "@/lib/utils";

const MOOD_GROUPS = ["negative", "neutral", "positive"] as const;

export interface MoodAvgData {
  ratingHighestKey: (typeof MOOD_GROUPS)[number];
  ratingHighestPercentage: number;
  distribution: {
    key: LogItem["rating"];
    count: number;
  }[];
  itemsCount: number;
}

export const defaultMoodAvgData: MoodAvgData = {
  ratingHighestKey: "neutral",
  ratingHighestPercentage: 0,
  itemsCount: 0,
  distribution: [],
};

export const getMoodAvgData = (items: LogItem[]): MoodAvgData => {
  const keys: LogItem["rating"][] = [...RATING_KEYS].reverse();

  const moods = {
    negative: 0,
    neutral: 0,
    positive: 0,
  };

  const avgMoods = getLogDays(items);

  avgMoods.forEach((item) => {
    if (["bad", "very_bad", "extremely_bad"].includes(item.ratingAvg)) {
      moods.negative++;
    }

    if (["good", "very_good", "extremely_good"].includes(item.ratingAvg)) {
      moods.positive++;
    }

    if (["neutral"].includes(item.ratingAvg)) {
      moods.neutral++;
    }
  });

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

  const ratingHighestKey = MOOD_GROUPS.reduce((a, b) =>
    moods[a] > moods[b] ? a : b
  );

  const percentage = Math.round((moods[ratingHighestKey] / rating_total) * 100);

  return {
    ratingHighestKey,
    ratingHighestPercentage: percentage,
    distribution: rating_distribution,
    itemsCount: ratings_total,
  };
};
