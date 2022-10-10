import _ from "lodash";
import { createContext, useContext, useState } from "react";
import { LogItem, useLogs } from "../useLogs";
import { useSettings } from "../useSettings";
import { defaultMoodAvgData, getMoodAvgData, MoodAvgData } from "./MoodAvg";
import { defaultMoodPeaksNegativeData, defaultMoodPeaksPositiveData, getMoodPeaksNegativeData, getMoodPeaksPositiveData, MoodPeaksNegativeData, MoodPeaksPositiveData } from "./MoodPeaks";
import { defaultMoodTrendData, getMoodTrendData, MoodTrendData } from "./MoodTrend";
import { defaultTagsDistributionData, getTagsDistributionData, TagsDistributionData } from "./TagsDistribution";
import { defaultTagsDistributionTrendData, getTagsDistributionTrendData, TagsDistributionTrendData } from "./TagsDistributionTrend";
import { getTagsPeaksData, TagsPeakData } from "./TagsPeaks";

const DELAY_LOADING = 1 * 1000;

const StatisticsContext = createContext(undefined)

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
  trends: {
    moodData: MoodTrendData;
    tagsDistributionData: TagsDistributionTrendData;
  }
}

interface Value {
  load: ({ force }: { force: boolean }) => void;
  isAvailable: (type: StatisticType) => boolean;
  isLoading: boolean;
  state: StatisticsState;
}

export function StatisticsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const logs = useLogs()
  const { settings } = useSettings();
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
    tagsPeaksData: {
      tags: [],
    },
    trends: {
      moodData: defaultMoodTrendData,
      tagsDistributionData: defaultTagsDistributionTrendData,
    }
  });

  const load = ({
    force = false,
  }: {
    force?: boolean;
  }) => {
    const highlightItems = Object.values(logs.state.items).filter(item => {
      const date = new Date(item.date)
      return date.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 14
    })
    const trendsItems = Object.values(logs.state.items)
    
    const highlightItemsChanged = !_.isEqual(prevHighlightItems, highlightItems)
    const trendsItemsChanged = !_.isEqual(prevTrendsItems, trendsItems)

    if(
      !highlightItemsChanged &&
      !trendsItemsChanged && 
      !force
    ) {
      return;
    }
    
    setIsLoading(true);

    const moodAvgData = getMoodAvgData(highlightItems);
    const moodPeaksPositiveData = getMoodPeaksPositiveData(highlightItems);
    const moodPeaksNegativeData = getMoodPeaksNegativeData(highlightItems);
    const tagsPeaksData = getTagsPeaksData(highlightItems, settings.tags);
    const tagsDistributionData = getTagsDistributionData(highlightItems, settings.tags);

    const moodTrendData = getMoodTrendData(trendsItems);
    const tagsDistributionTrendData = getTagsDistributionTrendData(trendsItems, settings.tags);

    const newState = {
      loaded: true,
      itemsCount: highlightItems.length,
      moodAvgData,
      moodPeaksPositiveData,
      moodPeaksNegativeData,
      tagsPeaksData,
      tagsDistributionData,
      trends: {
        moodData: moodTrendData,
        tagsDistributionData: tagsDistributionTrendData,
      }
    }
    
    setPrevHighlightItems(highlightItems)
    setPrevTrendsItems(trendsItems)
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
    if(type === "tags_distribution_trend") {
      return state.trends.tagsDistributionData.tags.length > 0;
    }
    if(type === 'mood_trend') {
      // check if there are at least 14 items per month
      // for(let i = 1; i <= 6; i++) {
      //   const monthStart = dayjs().subtract(i, 'month').startOf('month')
      //   const monthEnd = dayjs().subtract(i, 'month').endOf('month')
      //   const items = state.moodTrendData.items.filter(item => (
      //     dayjs(item.date).isAfter(monthStart) &&
      //     dayjs(item.date).isBefore(monthEnd)
      //   ))
      //   if(items.length < 14) {
      //     return false
      //   }
      // }
      return true
    }
    return false;
  };

  const value: Value = {
    load,
    isAvailable,
    isLoading,
    state,
  }
  
  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  )
}

export function useStatistics(): Value {
  const context = useContext(StatisticsContext)
  if (context === undefined) {
    throw new Error('useStatistics must be used within a StatisticsProvider')
  }
  return context
}