import { EMOTIONS } from "@/components/Logger/config";
import type { Emotion } from "@/types";
import _ from "lodash";
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
  emotions: _.sampleSize(EMOTIONS, 4).map((emotion) => ({
    id: emotion.key,
    details: emotion,
    count: _.random(1, 10),
  })),
};

export const getEmotionsDistributionData = (
  items: LogItem[]
): EmotionsDistributionData => {
  const distribution = _.countBy(items.flatMap((item) => item?.emotions));
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
