import { EMOTIONS } from "@/features/logger/config";
import type { Emotion } from "@/types";
import countBy from "lodash/countBy";
import random from "lodash/random";
import sampleSize from "lodash/sampleSize";
import type { LogItem } from "@/features/logs";

/** Emotion counts for the statistics emotions card, most used first. */
export interface EmotionsDistributionData {
  emotions: {
    id: string;
    details: Emotion;
    count: number;
  }[];
}

/** Empty state before statistics load. */
export const defaultEmotionsDistributionData: EmotionsDistributionData = {
  emotions: [],
};

/**
 * Random placeholder shown blurred behind the "not enough data" overlay.
 * Sampled once at module load.
 */
export const dummyEmotionsDistributionData: EmotionsDistributionData = {
  emotions: sampleSize(EMOTIONS, 4).map((emotion) => ({
    id: emotion.key,
    details: emotion,
    count: random(1, 10),
  })),
};

/**
 * Count emotions across entries. Keys missing from `EMOTIONS` (for example
 * removed emotions) are dropped.
 */
export const getEmotionsDistributionData = (
  items: LogItem[]
): EmotionsDistributionData => {
  const distribution = countBy(items.flatMap((item) => item?.emotions));
  const _emotions = Object.keys(distribution)
    .flatMap((key) => {
      const details = EMOTIONS.find((emotion) => emotion.key === key);
      return details === undefined
        ? []
        : [{ details, id: key, count: distribution[key] }];
    })
    .sort((a, b) => b.count - a.count);

  return {
    emotions: _emotions,
  };
};
