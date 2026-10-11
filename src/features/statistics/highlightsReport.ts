import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { getItemTime } from "@/lib/logDates";
import { getEmotionsDistributionData } from "./EmotionsDistributuon";
import type { EmotionsDistributionData } from "./EmotionsDistributuon";
import { getMoodAvgData } from "./MoodAvg";
import type { MoodAvgData } from "./MoodAvg";
import {
  getMoodPeaksNegativeData,
  getMoodPeaksPositiveData,
} from "./MoodPeaks";
import type { MoodPeaksNegativeData, MoodPeaksPositiveData } from "./MoodPeaks";
import { getPeopleDistributionData } from "./PeopleDistribution";
import type { PeopleDistributionData } from "./PeopleDistribution";
import { getPeoplePeaksData } from "./PeoplePeaks";
import type { PeoplePeaksData } from "./PeoplePeaks";
import { getSleepQualityDistributionForXDays } from "./SleepQualityDistribution";
import type { SleepQualityDistributionData } from "./SleepQualityDistribution";
import { getTagsDistributionData } from "./TagsDistribution";
import type { TagsDistributionData } from "./TagsDistribution";
import { getTagsPeaksData } from "./TagsPeaks";
import type { TagsPeakData } from "./TagsPeaks";

/** Length of the highlights window, counted back from `now`. */
export const HIGHLIGHTS_WINDOW_DAYS = 14;

/** Entries in the window the mood chart needs. */
const MOOD_CHART_MIN_ENTRIES = 4;

/** A tag peak is highlighted when the tag is on more entries than this. */
const TAG_PEAK_HIGHLIGHT_MIN_ENTRIES = 5;

/** Every statistics card the highlights report decides on. */
export type StatisticId =
  | "mood_avg"
  | "mood_peaks_positive"
  | "mood_peaks_negative"
  | "tags_peaks"
  | "tags_distribution"
  | "people_peaks"
  | "people_distribution"
  | "emotions_distribution"
  | "sleep_quality_distribution"
  | "mood_chart";

/**
 * `available`: the card has data to show.
 * `highlighted`: the data stands out enough for the short list.
 */
export interface StatisticCard {
  available: boolean;
  highlighted: boolean;
}

/** Card data computed over the entries in the window. */
export interface HighlightsData {
  moodAvgData: MoodAvgData;
  moodPeaksPositiveData: MoodPeaksPositiveData;
  moodPeaksNegativeData: MoodPeaksNegativeData;
  emotionsDistributionData: EmotionsDistributionData;
  /** Most used tag first. */
  tagsPeaksData: TagsPeakData;
  tagsDistributionData: TagsDistributionData;
  peopleDistributionData: PeopleDistributionData;
  peoplePeaksData: PeoplePeaksData;
  /** One bucket per day from `window.start` to `window.end`. */
  sleepQualityDistributionData: SleepQualityDistributionData;
}

/** Everything the highlights screens show for one point in time. */
export interface HighlightsReport {
  /**
   * Local days (`DATE_FORMAT`) the window touches. Entries count when
   * `now - 14 days <= dateTime <= now`, so only part of `start` counts.
   */
  window: { start: string; end: string };
  /** Entries in the window. */
  itemsCount: number;
  /** `true` with at least `STATISTIC_MIN_LOGS` entries in the window. */
  unlocked: boolean;
  /** Entries still needed to unlock; `0` once unlocked. */
  missingEntries: number;
  cards: Record<StatisticId, StatisticCard>;
  data: HighlightsData;
}

/** `true` when a tag peak is strong enough for the short list. */
export const isTagPeakHighlighted = (tag: TagsPeakData["tags"][number]) =>
  tag.items.length > TAG_PEAK_HIGHLIGHT_MIN_ENTRIES;

const card = (available: boolean, highlighted = available): StatisticCard => ({
  available,
  highlighted: available && highlighted,
});

const getCards = (
  data: HighlightsData,
  itemsCount: number
): Record<StatisticId, StatisticCard> => {
  const {
    moodAvgData,
    moodPeaksPositiveData,
    moodPeaksNegativeData,
    emotionsDistributionData,
    tagsPeaksData,
    tagsDistributionData,
    peopleDistributionData,
    peoplePeaksData,
    sleepQualityDistributionData,
  } = data;

  return {
    mood_avg: card(
      moodAvgData.itemsCount > 0,
      moodAvgData.ratingHighestPercentage > 60
    ),
    mood_peaks_positive: card(
      moodPeaksPositiveData.days.length > 0,
      moodPeaksPositiveData.days.length >= 2
    ),
    mood_peaks_negative: card(
      moodPeaksNegativeData.days.length > 0,
      moodPeaksNegativeData.days.length >= 2
    ),
    tags_peaks: card(
      tagsPeaksData.tags.length > 0,
      tagsPeaksData.tags.some(isTagPeakHighlighted)
    ),
    tags_distribution: card(tagsDistributionData.tags.length > 0),
    // A person needs a visible difference to make the short list.
    people_peaks: card(
      peoplePeaksData.people.length > 0,
      peoplePeaksData.people.some((entry) => Math.abs(entry.delta) >= 0.5)
    ),
    people_distribution: card(peopleDistributionData.people.length > 0),
    emotions_distribution: card(
      emotionsDistributionData.emotions.length > 3,
      emotionsDistributionData.emotions.some((emotion) => emotion.count > 5)
    ),
    sleep_quality_distribution: card(
      sleepQualityDistributionData.some((day) => day.value !== null)
    ),
    mood_chart: card(itemsCount >= MOOD_CHART_MIN_ENTRIES),
  };
};

/**
 * Build the highlights report for the {@link HIGHLIGHTS_WINDOW_DAYS} days
 * before `now`.
 *
 * Window: `now - 14 days <= dateTime <= now`, both edges inclusive. Entries
 * after `now` do not count. Pure: same input, same report.
 */
export const buildHighlightsReport = ({
  items,
  tags,
  people,
  now,
}: {
  items: LogItem[];
  tags: Tag[];
  people: Person[];
  now: Date;
}): HighlightsReport => {
  const end = dayjs(now);
  const start = end.subtract(HIGHLIGHTS_WINDOW_DAYS, "day");
  const startTime = start.valueOf();
  const endTime = end.valueOf();
  const window = {
    start: start.format(DATE_FORMAT),
    end: end.format(DATE_FORMAT),
  };

  const windowItems = items.filter((item) => {
    const time = getItemTime(item);
    return time >= startTime && time <= endTime;
  });

  const tagsPeaksData = getTagsPeaksData(windowItems, tags);
  // Fresh array from getTagsPeaksData, safe to sort in place.
  tagsPeaksData.tags.sort((a, b) => b.items.length - a.items.length);

  const data: HighlightsData = {
    moodAvgData: getMoodAvgData(windowItems),
    moodPeaksPositiveData: getMoodPeaksPositiveData(windowItems),
    moodPeaksNegativeData: getMoodPeaksNegativeData(windowItems),
    emotionsDistributionData: getEmotionsDistributionData(windowItems),
    tagsPeaksData,
    tagsDistributionData: getTagsDistributionData(windowItems, tags),
    peopleDistributionData: getPeopleDistributionData(windowItems, people),
    peoplePeaksData: getPeoplePeaksData(windowItems, people),
    sleepQualityDistributionData: getSleepQualityDistributionForXDays(
      windowItems,
      window.start,
      HIGHLIGHTS_WINDOW_DAYS
    ),
  };

  const itemsCount = windowItems.length;

  return {
    window,
    itemsCount,
    unlocked: itemsCount >= STATISTIC_MIN_LOGS,
    missingEntries: Math.max(0, STATISTIC_MIN_LOGS - itemsCount),
    cards: getCards(data, itemsCount),
    data,
  };
};
