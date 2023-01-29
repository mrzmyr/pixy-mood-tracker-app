import dayjs from "dayjs";
import _ from "lodash";
import { createContext, useContext, useState } from "react";
import { LogItem, useLogState } from "../useLogs";
import { useTagsState } from "../useTags";
import { defaultMoodAvgData, getMoodAvgData, MoodAvgData } from "./MoodAvg";
import {
  defaultMoodPeaksNegativeData,
  defaultMoodPeaksPositiveData,
  getMoodPeaksNegativeData,
  getMoodPeaksPositiveData,
  MoodPeaksNegativeData,
  MoodPeaksPositiveData
} from "./MoodPeaks";
import { defaultStreaksData, getCurrentStreak, getLongestStreak, StreaksData } from "./Streaks";
import {
  defaultTagsDistributionData,
  getTagsDistributionData,
  TagsDistributionData
} from "./TagsDistribution";
import { getTagsPeaksData, TagsPeakData } from "./TagsPeaks";
import { EmotionsDistributionData, defaultEmotionsDistributionData, getEmotionsDistributionData } from "./EmotionsDistributuon";
import { SleepQualityDistributionData, defaultSleepQualityDistributionDataForXDays, getSleepQualityDistributionForXDays } from "./SleepQualityDistribution";
import { DATE_FORMAT } from "@/constants/Config";

const DELAY_LOADING = 1 * 1000;

export const STATISTIC_TYPES = [
  "mood_avg",
  "mood_peaks_negative",
  "mood_peaks_positive",
  "tags_peaks",
  "tags_distribution",
];

type StatisticType = typeof STATISTIC_TYPES[number];

interface StatisticsState {
  loaded: boolean;
  itemsCount: number;
  moodAvgData: MoodAvgData;
  moodPeaksPositiveData: MoodPeaksPositiveData;
  moodPeaksNegativeData: MoodPeaksNegativeData;
  emotionsDistributionData: EmotionsDistributionData;
  tagsPeaksData: TagsPeakData;
  tagsDistributionData: TagsDistributionData;
  sleepQualityDistributionData: SleepQualityDistributionData;
  streaks: StreaksData;
}

interface Value {
  load: ({ force }: { force: boolean }) => void;
  isAvailable: (type: StatisticType) => boolean;
  isHighlighted: (type: StatisticType) => boolean;
  isLoading: boolean;
  state: StatisticsState;
}

const StatisticsContext = createContext({} as Value);

export function StatisticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const logState = useLogState()
  const { tags } = useTagsState()
  const [isLoading, setIsLoading] = useState(false);
  const [prevHighlightItems, setPrevHighlightItems] = useState<LogItem[]>([]);
  const [prevTrendsItems, setPrevTrendsItems] = useState<LogItem[]>([]);

  const [state, setState] = useState<StatisticsState>({
    loaded: false,
    itemsCount: 0,
    moodAvgData: defaultMoodAvgData,
    moodPeaksPositiveData: defaultMoodPeaksPositiveData,
    moodPeaksNegativeData: defaultMoodPeaksNegativeData,
    emotionsDistributionData: defaultEmotionsDistributionData,
    tagsDistributionData: defaultTagsDistributionData,
    sleepQualityDistributionData: defaultSleepQualityDistributionDataForXDays(),
    streaks: defaultStreaksData,
    tagsPeaksData: {
      tags: [],
    },
  });

  const load = ({ force = false }: { force?: boolean }) => {
    const highlightItems = logState.items.filter((item) => {
      return dayjs(item.dateTime).isAfter(dayjs().subtract(14, "day"));
    });
    const trendsItems = logState.items;

    const highlightItemsChanged = !_.isEqual(
      prevHighlightItems,
      highlightItems
    );
    const trendsItemsChanged = !_.isEqual(prevTrendsItems, trendsItems);

    if (!highlightItemsChanged && !trendsItemsChanged && !force) {
      return;
    }

    setIsLoading(true);

    const moodAvgData = getMoodAvgData(highlightItems);
    const moodPeaksPositiveData = getMoodPeaksPositiveData(highlightItems);
    const moodPeaksNegativeData = getMoodPeaksNegativeData(highlightItems);
    const tagsPeaksData = getTagsPeaksData(highlightItems, tags);
    const tagsDistributionData = getTagsDistributionData(
      highlightItems,
      tags
    );

    const emotionsDistributionData = getEmotionsDistributionData(highlightItems);

    const sleepQualityDistributionData = getSleepQualityDistributionForXDays(highlightItems, dayjs().subtract(14, "day").format(DATE_FORMAT), 30);

    const newState = {
      loaded: true,
      itemsCount: highlightItems.length,
      moodAvgData,
      moodPeaksPositiveData,
      moodPeaksNegativeData,
      tagsPeaksData,
      tagsDistributionData,
      emotionsDistributionData,
      sleepQualityDistributionData,
      streaks: {
        longest: getLongestStreak(logState.items),
        current: getCurrentStreak(logState.items),
      },
    };

    setPrevHighlightItems(highlightItems);
    setPrevTrendsItems(trendsItems);
    setState(newState);

    setTimeout(() => {
      setIsLoading(false);
    }, DELAY_LOADING);

    return newState;
  };

  const isAvailable = (type: typeof STATISTIC_TYPES[number]) => {
    if (type === "mood_avg") {
      return state.moodAvgData?.itemsCount > 0;
    }
    if (type === "mood_peaks_positive") {
      return state.moodPeaksPositiveData?.days.length > 0;
    }
    if (type === "mood_peaks_negative") {
      return state.moodPeaksNegativeData?.days.length > 0;
    }
    if (type === "tags_peaks") {
      return state.tagsPeaksData?.tags.length > 0;
    }
    if (type === "tags_distribution") {
      return state.tagsDistributionData?.tags.length > 0;
    }
    if (type === "emotions_distribution") {
      return state.emotionsDistributionData?.emotions.length > 3;
    }
    if (type === "sleep_quality_distribution") {
      return state.sleepQualityDistributionData?.length > 7;
    }
    return false;
  };

  const isHighlighted = (type: typeof STATISTIC_TYPES[number]) => {
    if (type === "mood_avg") {
      return (
        isAvailable(type) &&
        state.moodAvgData.ratingHighestPercentage > 60
      );
    }

    if (type === "mood_peaks_positive") {
      return (
        isAvailable(type) &&
        state.moodPeaksPositiveData.days.length >= 2
      );
    }

    if (type === "mood_peaks_negative") {
      return (
        isAvailable(type) &&
        state.moodPeaksNegativeData.days.length >= 2
      );
    }

    if (type === "tags_peaks") {
      return (
        isAvailable(type) &&
        state.tagsPeaksData.tags.filter((tag) => tag.items.length > 5).length > 0
      );
    }

    if (type === "tags_distribution") {
      return (
        isAvailable(type)
      )
    }

    if (type === "emotions_distribution") {
      return (
        isAvailable(type) &&
        state.emotionsDistributionData.emotions.some((emotion) => emotion.count > 5)
      );
    }

    return false;
  }

  const value: Value = {
    load,
    isAvailable,
    isHighlighted,
    isLoading,
    state,
  };

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
}

export function useStatistics(): Value {
  const context = useContext(StatisticsContext);
  if (context === undefined) {
    throw new Error("useStatistics must be used within a StatisticsProvider");
  }
  return context;
}
