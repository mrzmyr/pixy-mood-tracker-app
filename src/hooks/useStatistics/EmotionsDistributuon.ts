import { EMOTIONS } from "@/components/Logger/config";
import type { Emotion } from "@/types";
import countBy from "lodash/countBy";
import random from "lodash/random";
import sampleSize from "lodash/sampleSize";
import type { LogItem } from "../useLogs";

export interface EmotionsDistributionData {
  emotions: {
    id: string;
    details: Emotion;
    count: number;
  }[];
}

export const defaultEmotionsDistributionData: EmotionsDistributionData = {
  emotions: [],
};

export const dummyEmotionsDistributionData: EmotionsDistributionData = {
  emotions: sampleSize(EMOTIONS, 4).map((emotion) => ({
    id: emotion.key,
    details: emotion,
    count: random(1, 10),
  })),
};

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
    .toSorted((a, b) => b.count - a.count);

  return {
    emotions: _emotions,
  };
};
