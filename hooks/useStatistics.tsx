import _ from "lodash";
import { useState } from "react";
import { LogItem, useLogs } from "./useLogs";
import { Tag as ITag, useSettings } from "./useSettings";

export const STATISTIC_TYPES = [
  "mood_avg",
  "mood_peaks_negative",
  "mood_peaks_positive",
  "tags_peaks",
  "tags_distribution",
];

export interface TagsPeakData {
  tags: (ITag & {
    items: LogItem[];
  })[]
}

export interface MoodAvgData {
  ratingHighestKey: LogItem["rating"];
  ratingHighestPercentage: number;
  distribution: {
    key: LogItem["rating"];
    count: number;
  }[];
  itemsCount: number;
}

export interface MoodPeaksPositiveData {
  items: LogItem[];
}

export interface MoodPeaksNegativeData {
  items: LogItem[];
}

export interface TagsDistributionData {
  tags: {
    id: string;
    details: ITag;
    count: number;
  }[];
  itemsCount: number;
}

interface StatisticsState {
  moodAvgData: MoodAvgData;
  moodPeaksPositiveData: MoodPeaksPositiveData;
  moodPeaksNegativeData: MoodPeaksNegativeData;
  tagsPeaksData: TagsPeakData;
  tagsDistributionData: TagsDistributionData;
}

export function useStatistics() {
  const { state: logState } = useLogs();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<StatisticsState>({
    moodAvgData: {
      ratingHighestKey: "neutral",
      ratingHighestPercentage: 0,
      itemsCount: 0,
      distribution: [],
    },
    moodPeaksPositiveData: {
      items: [],
    },
    moodPeaksNegativeData: {
      items: [],
    },
    tagsDistributionData: {
      tags: [],
      itemsCount: 0,
    },
    tagsPeaksData: {
      tags: [],
    },
  });

  const getTagsPeaksData = (items: LogItem[]): TagsPeakData => {
    const distribution = _.countBy(
      items.flatMap((item) => item?.tags?.map((tag) => tag?.id))
    );
    const tags = Object.keys(distribution)
      .filter((key) => distribution[key] >= 5)
      .map((key) => ({
        ...settings.tags.find((tag) => tag.id === key),
        items: items.filter((item) => item.tags?.find((tag) => tag.id === key)),
      }))
      .filter((tag) => tag);

    return { 
      tags,
    };
  };

  const getTagsDistributionData = (items: LogItem[]): TagsDistributionData => {
    const distribution = _.countBy(
      items.flatMap((item) => item?.tags?.map((tag) => tag?.id))
    );
    const tags = Object.keys(distribution)
      .map((key) => ({
        details: settings.tags.find((tag) => tag.id === key),
        id: key,
        count: distribution[key],
      }))
      .filter((tag) => tag.details !== undefined)
      .sort((a, b) => b.count - a.count);

    const itemsWithTags = items.filter((item) => item?.tags?.length > 0);

    return {
      tags,
      itemsCount: itemsWithTags.length,
    };
  };

  const getMoodAvgData = (items: LogItem[]): MoodAvgData => {
    const keys: LogItem["rating"][] = [
      "extremely_good",
      "very_good",
      "good",
      "neutral",
      "bad",
      "very_bad",
      "extremely_bad",
    ];

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

  const getMoodPeaksPositiveData = (items: LogItem[]): MoodPeaksPositiveData => {
    const positiveKeys = ["extremely_good", "very_good"];

    const positiveItemsPeaked = items.filter((item) =>
      positiveKeys.includes(item.rating)
    );

    return {
      items: positiveItemsPeaked,
    };
  };

  const getMoodPeaksNegativeData = (items: LogItem[]): MoodPeaksNegativeData => {
    const negativeKeys = ["extremely_bad", "very_bad"];

    const negativeItemsPeaked = items.filter((item) =>
      negativeKeys.includes(item.rating)
    );

    return {
      items: negativeItemsPeaked,
    };
  };

  const load = () => {
    setIsLoading(true);
    
    const items = Object.values(logState.items).filter((item) => {
      const date = new Date(item.date);
      return date.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 14;
    });

    const moodAvgData = getMoodAvgData(items);
    const moodPeaksPositiveData = getMoodPeaksPositiveData(items);
    const moodPeaksNegativeData = getMoodPeaksNegativeData(items);
    const tagsPeaksData = getTagsPeaksData(items);
    const tagsDistributionData = getTagsDistributionData(items);

    const newState = {
      moodAvgData,
      moodPeaksPositiveData,
      moodPeaksNegativeData,
      tagsPeaksData,
      tagsDistributionData,
    }
    
    setState(newState);

    setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return newState;
  };

  const isAvailable = (type: typeof STATISTIC_TYPES[number]) => {
    if (type === "mood_avg") {
      return state.moodAvgData?.itemsCount > 0;
    }
    if (type === "mood_peaks_positive") {
      return state.moodPeaksPositiveData?.items.length > 0;
    }
    if (type === "mood_peaks_negative") {
      return state.moodPeaksNegativeData?.items.length > 0;
    }
    if (type === "tags_peaks") {
      return state.tagsPeaksData?.tags.length > 0;
    }
    if (type === "tags_distribution") {
      return state.tagsDistributionData?.itemsCount > 0;
    }
    return false;
  };

  return {
    load,
    isAvailable,
    isLoading,
    state,
  };
}
