import { LogItem, RATING_KEYS } from "../useLogs";
import { getLogDays } from '@/lib/utils';

export interface MoodAvgData {
  ratingHighestKey: LogItem["rating"];
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
}

export const getMoodAvgData = (items: LogItem[]): MoodAvgData => {
  const keys: LogItem["rating"][] = [...RATING_KEYS].reverse()

  const moods = {
    negative: 0,
    neutral: 0,
    positive: 0,
  }

  const avgMoods = getLogDays(items)

  avgMoods.forEach((item) => {
    if (["bad", "very_bad", "extremely_bad"].includes(item.ratingAvg)) {
      moods.negative++
    }

    if (["good", "very_good", "extremely_good"].includes(item.ratingAvg)) {
      moods.positive++
    }

    if (["neutral"].includes(item.ratingAvg)) {
      moods.neutral++
    }
  })

  const rating_total = moods.negative + moods.neutral + moods.positive;

  const rating_distribution = keys.map((key) => {
    const count = items.filter((item) => item.rating === key).length;
    return {
      key: key as LogItem["rating"],
      count,
    };
  });

  const ratings_total = rating_distribution.reduce(
    (acc, item) => acc + item.count,
    0
  );

  const ratingHighestKey = Object.keys(moods).reduce((a, b) =>
    moods[a] > moods[b] ? a : b
  ) as LogItem["rating"];

  const percentage = Math.round(
    (moods[ratingHighestKey] / rating_total) * 100
  );

  return {
    ratingHighestKey,
    ratingHighestPercentage: percentage,
    distribution: rating_distribution,
    itemsCount: ratings_total,
  };
};