import { useEffect, useEffectEvent } from "react";
import { useContentStableValue } from "@/hooks/useContentStableValue";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import type { HighlightsProperties } from "@/state/analytics/events";
import { useStatistics } from "../../../StatisticsProvider";
import { MoodAvgCard } from "../MoodAvgCard";
import { MoodPeaksCard } from "../MoodPeaksCards";
import { TagPeaksCard } from "../TagPeaksCards";
import { TagsDistributionCard } from "../TagsDistributionCard";
import { Title } from "../Title";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import { MoodChart } from "../MoodChart";
import { useLogState } from "@/features/logs";
import { SleepQualityChartCard } from "../SleepQualityGraph";
import { getItemTime } from "@/lib/logDates";

/**
 * Full highlights screen with every available statistics card for the
 * last 14 days. Must render inside `StatisticsProvider`; cards appear once
 * statistics are loaded.
 */
export const StatisticsHighlights = () => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const analytics = useAnalytics();
  const statistics = useStatistics();

  const showMoodAvg = statistics.isAvailable("mood_avg");
  const showMoodPeaksPositve = statistics.isAvailable("mood_peaks_positive");
  const showMoodPeaksNegative = statistics.isAvailable("mood_peaks_negative");
  const showTagPeaks = statistics.isAvailable("tags_peaks");
  const showTagsDistribution = statistics.isAvailable("tags_distribution");

  const logState = useLogState();

  const showSleepQualityChart = statistics.isAvailable(
    "sleep_quality_distribution"
  );
  const highlightsStartTime = dayjs().subtract(14, "day").valueOf();
  const highlightsItemCount = logState.items.filter(
    (item) => getItemTime(item) > highlightsStartTime
  ).length;
  const showMoodChart = highlightsItemCount >= 4;

  // Effect event: tracks with the latest visibility flags and analytics, but
  // only when the statistics content changes (see the effect below).
  const trackHighlights = useEffectEvent(() => {
    const highlights: HighlightsProperties = {
      items_count: statistics.state.itemsCount,
      mood_avg_show: showMoodAvg,
      mood_peaks_positive_show: showMoodPeaksPositve,
      mood_peaks_negative_show: showMoodPeaksNegative,
      tags_peaks_show: showTagPeaks,
      tags_distribution_show: showTagsDistribution,
      mood_chart_show: showMoodChart,
      sleep_quality_distribution_show: showSleepQualityChart,
    };

    if (showMoodPeaksPositve) {
      highlights.mood_peaks_positive_count =
        statistics.state.moodPeaksPositiveData.days.length;
    }
    if (showMoodPeaksNegative) {
      highlights.mood_peaks_negative_count =
        statistics.state.moodPeaksNegativeData.days.length;
    }
    if (showTagPeaks) {
      highlights.tags_peaks_count = statistics.state.tagsPeaksData.tags.length;
    }
    if (showTagsDistribution) {
      highlights.tags_distribution_tag_count =
        statistics.state.tagsDistributionData.tags.length;
    }
    if (showMoodChart) {
      highlights.mood_chart_item_count = highlightsItemCount;
    }

    analytics.track("statistics:all_highlights_viewed", highlights);
  });

  // Stays referentially equal while the statistics content is unchanged.
  const stableStatisticsState = useContentStableValue(statistics.state);

  useEffect(() => {
    if (!stableStatisticsState.loaded) {
      return;
    }

    trackHighlights();
  }, [stableStatisticsState]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          <Title>{t("statistics_2_week_highlights")}</Title>

          {statistics.isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 32,
              }}
            >
              <ActivityIndicator color={colors.loadingIndicator} />
            </View>
          ) : (
            <>
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

              {statistics.isAvailable("mood_avg") && (
                <MoodAvgCard data={statistics.state.moodAvgData} />
              )}

              {statistics.isAvailable("mood_peaks_positive") && (
                <MoodPeaksCard
                  data={statistics.state.moodPeaksPositiveData}
                  type="positive"
                  startDate={dayjs().subtract(14, "day").format(DATE_FORMAT)}
                  endDate={dayjs().format(DATE_FORMAT)}
                />
              )}

              {statistics.isAvailable("mood_peaks_negative") && (
                <MoodPeaksCard
                  data={statistics.state.moodPeaksNegativeData}
                  type="negative"
                  startDate={dayjs().subtract(14, "day").format(DATE_FORMAT)}
                  endDate={dayjs().format(DATE_FORMAT)}
                />
              )}

              {statistics.isAvailable("tags_distribution") && (
                <TagsDistributionCard
                  data={statistics.state.tagsDistributionData}
                />
              )}

              {statistics.isAvailable("tags_peaks") && (
                <>
                  {statistics.state.tagsPeaksData.tags.map((tag) => (
                    <TagPeaksCard key={tag.id} tag={tag} />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
