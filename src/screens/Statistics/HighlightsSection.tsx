import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import type { ReactElement } from "react";
import { useEffect, useEffectEvent } from "react";
import { useContentStableValue } from "../../hooks/useContentStableValue";
import { Text, View } from "react-native";
import { Activity } from "react-native-feather";
import { useAnalytics } from "../../hooks/useAnalytics";
import useColors from "../../hooks/useColors";
import type { LogItem } from "../../hooks/useLogs";
import { useLogState } from "../../hooks/useLogs";
import { useStatistics } from "../../hooks/useStatistics";
import type { MoodAvgData } from "../../hooks/useStatistics/MoodAvg";
import { EmotionsDistributionCard } from "./EmotionsDistributionCard";
import { MoodAvgCard } from "./MoodAvgCard";
import { MoodChart } from "./MoodChart";
import { MoodPeaksCard } from "./MoodPeaksCards";
import { SleepQualityChartCard } from "./SleepQualityGraph";
import { Subtitle } from "./Subtitle";
import { TagPeaksCard } from "./TagPeaksCards";
import { TagsDistributionCard } from "./TagsDistributionCard";
import { Title } from "./Title";
import { getItemTime } from "@/lib/logDates";

const EmptryState = () => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 16,
        padding: 16,
        paddingVertical: 32,
        borderWidth: 1,
        borderColor: colors.statisticsNoDataBorder,
        borderStyle: "dashed",
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 17,
          textAlign: "center",
        }}
      >
        {t("statistics_no_highlights")}
      </Text>
    </View>
  );
};

interface HighlightCards {
  mood_avg_show: boolean;
  mood_avg_type?: MoodAvgData["ratingHighestKey"];
  mood_avg_percentage?: MoodAvgData["ratingHighestPercentage"];
  mood_peaks_positive_show: boolean;
  mood_peaks_positive_count?: number;
  mood_peaks_negative_show: boolean;
  mood_peaks_negative_count?: number;
  tags_peaks_show: boolean;
  tags_peaks_count?: number;
  tags_distribution_show: boolean;
  tags_distribution_tag_count?: number;
  tags_distribution_item_count?: number;
  mood_chart_show: boolean;
  mood_chart_item_count?: number;
  emotions_distribution_show: boolean;
  emotions_distribution_item_count?: number;
  sleep_quality_distribution_show: boolean;
}

/**
 * Highlight cards on the Statistics tab for the last 14 days. The `items`
 * prop is unused; data comes from `StatisticsProvider`.
 */
export const HighlightsSection = (_props: { items: LogItem[] }) => {
  const colors = useColors();
  const navigation = useNavigation();
  const analytics = useAnalytics();
  const statistics = useStatistics();
  const logState = useLogState();

  const showMoodAvg = statistics.isHighlighted("mood_avg");
  const showMoodPeaksPositve = statistics.isHighlighted("mood_peaks_positive");
  const showMoodPeaksNegative = statistics.isHighlighted("mood_peaks_negative");
  const showTagPeaks = statistics.isHighlighted("tags_peaks");
  const showTagsDistribution = statistics.isAvailable("tags_distribution");
  const showEmotionsDistribution = statistics.isAvailable(
    "emotions_distribution"
  );
  const highlightsStartTime = dayjs().subtract(14, "day").valueOf();
  const highlightsItemCount = logState.items.filter(
    (item) => getItemTime(item) > highlightsStartTime
  ).length;
  const showMoodChart = highlightsItemCount >= 4;
  const showSleepQualityChart = statistics.isAvailable(
    "sleep_quality_distribution"
  );

  // Effect event: tracks with the latest visibility flags and analytics, but
  // only when the statistics content changes (see the effect below).
  const trackHighlights = useEffectEvent(() => {
    const cards: HighlightCards = {
      mood_avg_show: showMoodAvg,
      mood_peaks_positive_show: showMoodPeaksPositve,
      mood_peaks_negative_show: showMoodPeaksNegative,
      tags_peaks_show: showTagPeaks,
      tags_distribution_show: showTagsDistribution,
      mood_chart_show: showMoodChart,
      emotions_distribution_show: showEmotionsDistribution,
      sleep_quality_distribution_show: showSleepQualityChart,
    };

    if (showMoodAvg) {
      cards.mood_avg_type = statistics.state.moodAvgData.ratingHighestKey;
      cards.mood_avg_percentage =
        statistics.state.moodAvgData.ratingHighestPercentage;
    }
    if (showMoodPeaksPositve) {
      cards.mood_peaks_positive_count =
        statistics.state.moodPeaksPositiveData.days.length;
    }
    if (showMoodPeaksNegative) {
      cards.mood_peaks_negative_count =
        statistics.state.moodPeaksNegativeData.days.length;
    }
    if (showTagPeaks) {
      cards.tags_peaks_count = statistics.state.tagsPeaksData.tags.length;
    }
    if (showTagsDistribution) {
      cards.tags_distribution_tag_count =
        statistics.state.tagsDistributionData.tags.length;
    }
    if (showMoodChart) {
      cards.mood_chart_item_count = highlightsItemCount;
    }
    if (showEmotionsDistribution) {
      cards.emotions_distribution_item_count =
        statistics.state.emotionsDistributionData.emotions.length;
    }

    analytics.track("statistics_relevant_highlights", {
      itemsCount: statistics.state.itemsCount,
      ...cards,
    });
  });

  // Stays referentially equal while the statistics content is unchanged.
  const stableStatisticsState = useContentStableValue(statistics.state);

  useEffect(() => {
    if (!stableStatisticsState.loaded) {
      return;
    }

    trackHighlights();
  }, [stableStatisticsState]);

  const tagPeaksCards: ReactElement[] = [];
  if (showTagPeaks) {
    const peakTags = statistics.state.tagsPeaksData.tags;
    // oxlint-disable-next-line unicorn/no-array-sort -- sorts shared statistics state in place on purpose; StatisticsHighlights renders the same array and relies on this order.
    peakTags.sort((a, b) => b.items.length - a.items.length);
    for (const tag of peakTags) {
      if (tag.items.length > 5) {
        tagPeaksCards.push(<TagPeaksCard key={tag.id} tag={tag} />);
      }
    }
  }

  return (
    <>
      <Title>{t("statistics_highlights")}</Title>
      <Subtitle>{t("statistics_highlights_description")}</Subtitle>

      <View
        style={{
          flex: 1,
        }}
      >
        {!showMoodAvg &&
          !showMoodPeaksPositve &&
          !showMoodPeaksNegative &&
          !showTagPeaks &&
          !showTagsDistribution &&
          !showMoodChart && <EmptryState />}

        {showMoodChart && (
          <MoodChart
            title={t("statistics_mood_chart_highlights_title")}
            startDate={dayjs().subtract(14, "days").format(DATE_FORMAT)}
          />
        )}

        {showSleepQualityChart && (
          <SleepQualityChartCard
            title={t("statistics_sleep_quality_chart_highlights_title")}
            startDate={dayjs().subtract(14, "days").format(DATE_FORMAT)}
          />
        )}

        {showMoodChart && (
          <EmotionsDistributionCard
            data={statistics.state.emotionsDistributionData}
          />
        )}

        {showMoodAvg && <MoodAvgCard data={statistics.state.moodAvgData} />}

        {showMoodPeaksPositve && (
          <MoodPeaksCard
            data={statistics.state.moodPeaksPositiveData}
            type="positive"
            startDate={dayjs().subtract(14, "days").format(DATE_FORMAT)}
            endDate={dayjs().format(DATE_FORMAT)}
          />
        )}

        {showMoodPeaksNegative && (
          <MoodPeaksCard
            data={statistics.state.moodPeaksNegativeData}
            type="negative"
            startDate={dayjs().subtract(14, "days").format(DATE_FORMAT)}
            endDate={dayjs().format(DATE_FORMAT)}
          />
        )}

        {showTagsDistribution && (
          <TagsDistributionCard data={statistics.state.tagsDistributionData} />
        )}

        {showTagPeaks && tagPeaksCards}

        <MenuList
          style={{
            marginTop: 16,
          }}
        >
          <MenuListItem
            title={t("statistics_highlights_more")}
            isLink
            isLast
            onPress={() => navigation.navigate("StatisticsHighlights")}
            iconLeft={<Activity width={18} height={18} color={colors.text} />}
          />
        </MenuList>
      </View>
    </>
  );
};
