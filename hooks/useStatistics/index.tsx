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
import {
  defaultMoodTrendData,
  getMoodTrendData,
  MoodTrendData
} from "./MoodTrend";
import { defaultStreaksData, getCurrentStreak, getLongestStreak, StreaksData } from "./Streaks";
import {
  defaultTagsDistributionData,
  getTagsDistributionData,
  TagsDistributionData
} from "./TagsDistribution";
import {
  defaultTagsDistributionTrendData,
  getTagsDistributionTrendData,
  TagsDistributionTrendData
} from "./TagsDistributionTrend";
import { getTagsPeaksData, TagsPeakData } from "./TagsPeaks";

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
  tagsPeaksData: TagsPeakData;
  tagsDistributionData: TagsDistributionData;
  streaks: StreaksData;
  trends: {
    moodData: MoodTrendData;
    tagsDistributionData: TagsDistributionTrendData;
  };
}

interface Value {
  load: ({ force }: { force: boolean }) => void;
  isAvailable: (type: StatisticType) => boolean;
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
    tagsDistributionData: defaultTagsDistributionData,
    streaks: defaultStreaksData,
    tagsPeaksData: {
      tags: [],
    },
    trends: {
      moodData: defaultMoodTrendData,
      tagsDistributionData: defaultTagsDistributionTrendData,
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

    const moodTrendData = getMoodTrendData(trendsItems);
    const tagsDistributionTrendData = getTagsDistributionTrendData(
      trendsItems,
      tags
    );

    const newState = {
      loaded: true,
      itemsCount: highlightItems.length,
      moodAvgData,
      moodPeaksPositiveData,
      moodPeaksNegativeData,
      tagsPeaksData,
      tagsDistributionData,
      streaks: {
        longest: getLongestStreak(logState.items),
        current: getCurrentStreak(logState.items),
      },
      trends: {
        moodData: moodTrendData,
        tagsDistributionData: tagsDistributionTrendData,
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
    if (type === "tags_distribution_trend") {
      return state.trends.tagsDistributionData.tags.length > 0;
    }
    if (type === "mood_trend") {
      return (
        state.trends.moodData.avgPeriod1 > 0 &&
        state.trends.moodData.avgPeriod2 > 0 &&
        state.trends.moodData.diff > 0
      )
    }
    return false;
  };

  const value: Value = {
    load,
    isAvailable,
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
