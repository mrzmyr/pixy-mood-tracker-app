import { LogItem, RATING_KEYS } from "../useLogs";

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

  const rating_negative = Object.values(items).filter((item) =>
    ["bad", "very_bad", "extremely_bad"].includes(item.rating)
  ).length;
  const rating_positive = Object.values(items).filter((item) =>
    ["good", "very_good", "extremely_good"].includes(item.rating)
  ).length;
  const rating_neutral = Object.values(items).filter((item) =>
    ["neutral"].includes(item.rating)
  ).length;

  const rating = {
    negative: rating_negative,
    neutral: rating_neutral,
    positive: rating_positive,
  };
  const rating_total = rating_negative + rating_neutral + rating_positive;

  const rating_distribution = keys.map((key) => {
    const count = Object.values(items).filter((item) => item.rating === key).length;
    return {
      key,
      count,
    };
  });

  const ratings_total = rating_distribution.reduce(
    (acc, item) => acc + item.count,
    0
  );
  const ratingHighestKey = Object.keys(rating).reduce((a, b) =>
    rating[a] > rating[b] ? a : b
  ) as LogItem["rating"];

  const percentage = Math.round(
    (rating[ratingHighestKey] / rating_total) * 100
  );

  return {
    ratingHighestKey,
    ratingHighestPercentage: percentage,
    distribution: rating_distribution,
    itemsCount: ratings_total,
  };
};