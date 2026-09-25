import dayjs from "dayjs";
import isEqual from "lodash/isEqual";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { LogItem } from "@/hooks/useLogs";
import { useLogState } from "@/hooks/useLogs";
import { useTagsState } from "@/hooks/useTags";
import type { MoodAvgData } from "./MoodAvg";
import { defaultMoodAvgData, getMoodAvgData } from "./MoodAvg";
import type { MoodPeaksNegativeData, MoodPeaksPositiveData } from "./MoodPeaks";
import {
  defaultMoodPeaksNegativeData,
  defaultMoodPeaksPositiveData,
  getMoodPeaksNegativeData,
  getMoodPeaksPositiveData,
} from "./MoodPeaks";
import type { StreaksData } from "./Streaks";
import {
  defaultStreaksData,
  getCurrentStreak,
  getLongestStreak,
} from "./Streaks";
import type { TagsDistributionData } from "./TagsDistribution";
import {
  defaultTagsDistributionData,
  getTagsDistributionData,
} from "./TagsDistribution";
import type { TagsPeakData } from "./TagsPeaks";
import { getTagsPeaksData } from "./TagsPeaks";
import type { EmotionsDistributionData } from "./EmotionsDistributuon";
import {
  defaultEmotionsDistributionData,
  getEmotionsDistributionData,
} from "./EmotionsDistributuon";
import type { SleepQualityDistributionData } from "./SleepQualityDistribution";
import {
  defaultSleepQualityDistributionDataForXDays,
  getSleepQualityDistributionForXDays,
} from "./SleepQualityDistribution";
import { DATE_FORMAT } from "@/constants/Config";
import { createMissingProviderError } from "@/lib/errors";
import { getItemTime } from "@/lib/logDates";

const DELAY_LOADING = 1 * 1000;

const STATISTIC_TYPES = [
  "mood_avg",
  "mood_peaks_negative",
  "mood_peaks_positive",
  "tags_peaks",
  "tags_distribution",
];

type StatisticType = (typeof STATISTIC_TYPES)[number];

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

// SAFETY: every consumer renders inside StatisticsProvider, which supplies the full Value.
const StatisticsContext = createContext({} as Value);

/**
 * Computes statistics for the statistics tab.
 *
 * Nothing is computed until a consumer calls `load`, which skips the work
 * when log items are unchanged unless `force` is set. Highlights cover the
 * last 14 days. Must render inside the logs and tags providers.
 */
export const StatisticsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const logState = useLogState();
  const { tags } = useTagsState();
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

  const load = useCallback(
    ({ force = false }: { force?: boolean }) => {
      const highlightsStartTime = dayjs().subtract(14, "day").valueOf();
      const highlightItems = logState.items.filter(
        (item) => getItemTime(item) > highlightsStartTime
      );
      const trendsItems = logState.items;

      const highlightItemsChanged = !isEqual(
        prevHighlightItems,
        highlightItems
      );
      const trendsItemsChanged = !isEqual(prevTrendsItems, trendsItems);

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

      const emotionsDistributionData =
        getEmotionsDistributionData(highlightItems);

      const sleepQualityDistributionData = getSleepQualityDistributionForXDays(
        highlightItems,
        dayjs().subtract(14, "day").format(DATE_FORMAT),
        30
      );

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
    },
    [logState.items, prevHighlightItems, prevTrendsItems, tags]
  );

  const isAvailable = useCallback(
    (type: (typeof STATISTIC_TYPES)[number]) => {
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
        return state.sleepQualityDistributionData?.some(
          (item) => item.value !== null
        );
      }
      return false;
    },
    [state]
  );

  const isHighlighted = useCallback(
    (type: (typeof STATISTIC_TYPES)[number]) => {
      if (type === "mood_avg") {
        return (
          isAvailable(type) && state.moodAvgData.ratingHighestPercentage > 60
        );
      }

      if (type === "mood_peaks_positive") {
        return (
          isAvailable(type) && state.moodPeaksPositiveData.days.length >= 2
        );
      }

      if (type === "mood_peaks_negative") {
        return (
          isAvailable(type) && state.moodPeaksNegativeData.days.length >= 2
        );
      }

      if (type === "tags_peaks") {
        return (
          isAvailable(type) &&
          state.tagsPeaksData.tags.some((tag) => tag.items.length > 5)
        );
      }

      if (type === "tags_distribution") {
        return isAvailable(type);
      }

      if (type === "emotions_distribution") {
        return (
          isAvailable(type) &&
          state.emotionsDistributionData.emotions.some(
            (emotion) => emotion.count > 5
          )
        );
      }

      return false;
    },
    [isAvailable, state]
  );

  const value: Value = useMemo(
    () => ({
      load,
      isAvailable,
      isHighlighted,
      isLoading,
      state,
    }),
    [load, isAvailable, isHighlighted, isLoading, state]
  );

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
};

/**
 * Statistics state and loader. Must render inside {@link StatisticsProvider}.
 */
export const useStatistics = (): Value => {
  const context = useContext(StatisticsContext);
  if (context === undefined) {
    throw createMissingProviderError("useStatistics", "StatisticsProvider");
  }
  return context;
};
