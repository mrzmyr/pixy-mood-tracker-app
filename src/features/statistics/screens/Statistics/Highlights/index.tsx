import { useEffect, useEffectEvent } from "react";
import { useContentStableValue } from "@/hooks/useContentStableValue";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { useAnalytics } from "@/state/analytics";
import type { HighlightsProperties } from "@/state/analytics/events";
import { useStatistics } from "../../../StatisticsProvider";
import type { HighlightsReport } from "../../../highlightsReport";
import { MoodAvgCard } from "../MoodAvgCard";
import { MoodPeaksCard } from "../MoodPeaksCards";
import { TagPeaksCard } from "../TagPeaksCards";
import { TagsDistributionCard } from "../TagsDistributionCard";
import { Title } from "../Title";
import { t } from "@/lib/translation";
import { MoodChart } from "../MoodChart";
import { SleepQualityChartCard } from "../SleepQualityGraph";
import { useFeatureFlag } from "@/state/featureFlags";
import { PeopleHighlights } from "../PeopleHighlights";
import {
  getPeopleHighlightProperties,
  getPeopleHighlightsState,
} from "../peopleHighlightsState";

const ReportCards = ({
  report,
  hasPeople,
}: {
  report: HighlightsReport;
  hasPeople: boolean;
}) => {
  const { cards, data, window } = report;
  const peopleHighlights = getPeopleHighlightsState({
    hasPeople,
    highlightedOnly: false,
    cards,
  });

  return (
    <>
      {cards.mood_chart.available && (
        <MoodChart
          title={t("statistics_mood_chart_highlights_title")}
          startDate={window.start}
        />
      )}

      {cards.sleep_quality_distribution.available && (
        <SleepQualityChartCard
          title={t("statistics_sleep_quality_chart_highlights_title")}
          startDate={window.start}
        />
      )}

      {cards.mood_avg.available && <MoodAvgCard data={data.moodAvgData} />}

      {cards.mood_peaks_positive.available && (
        <MoodPeaksCard
          data={data.moodPeaksPositiveData}
          type="positive"
          startDate={window.start}
          endDate={window.end}
        />
      )}

      {cards.mood_peaks_negative.available && (
        <MoodPeaksCard
          data={data.moodPeaksNegativeData}
          type="negative"
          startDate={window.start}
          endDate={window.end}
        />
      )}

      {cards.tags_distribution.available && (
        <TagsDistributionCard data={data.tagsDistributionData} />
      )}

      {cards.tags_peaks.available &&
        data.tagsPeaksData.tags.map((tag) => (
          <TagPeaksCard
            key={tag.id}
            tag={tag}
            startDate={window.start}
            endDate={window.end}
          />
        ))}

      <PeopleHighlights
        state={peopleHighlights}
        distribution={data.peopleDistributionData}
        peaks={data.peoplePeaksData}
      />
    </>
  );
};

/**
 * Full highlights screen with every available card of the highlights
 * report. Must render inside `StatisticsProvider`; cards appear once the
 * report is built.
 */
export const StatisticsHighlights = () => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const analytics = useAnalytics();
  const statistics = useStatistics();

  const hasPeople = useFeatureFlag("people");
  const { report } = statistics;

  // Effect event: tracks with the latest visibility flags and analytics, but
  // only when the report content changes (see the effect below).
  const trackHighlights = useEffectEvent((loaded: HighlightsReport) => {
    const { cards, data } = loaded;
    const highlights: HighlightsProperties = {
      items_count: loaded.itemsCount,
      mood_avg_show: cards.mood_avg.available,
      mood_peaks_positive_show: cards.mood_peaks_positive.available,
      mood_peaks_negative_show: cards.mood_peaks_negative.available,
      tags_peaks_show: cards.tags_peaks.available,
      tags_distribution_show: cards.tags_distribution.available,
      mood_chart_show: cards.mood_chart.available,
      sleep_quality_distribution_show:
        cards.sleep_quality_distribution.available,
    };

    if (cards.mood_peaks_positive.available) {
      highlights.mood_peaks_positive_count =
        data.moodPeaksPositiveData.days.length;
    }
    if (cards.mood_peaks_negative.available) {
      highlights.mood_peaks_negative_count =
        data.moodPeaksNegativeData.days.length;
    }
    if (cards.tags_peaks.available) {
      highlights.tags_peaks_count = data.tagsPeaksData.tags.length;
    }
    if (cards.tags_distribution.available) {
      highlights.tags_distribution_tag_count =
        data.tagsDistributionData.tags.length;
    }
    if (cards.mood_chart.available) {
      highlights.mood_chart_item_count = loaded.itemsCount;
    }
    Object.assign(
      highlights,
      getPeopleHighlightProperties({
        hasPeople,
        state: getPeopleHighlightsState({
          hasPeople,
          highlightedOnly: false,
          cards,
        }),
        distribution: data.peopleDistributionData,
        peaks: data.peoplePeaksData,
      })
    );

    analytics.track("statistics:all_highlights_viewed", highlights);
  });

  // Stays referentially equal while the report content is unchanged.
  const stableReport = useContentStableValue(report);

  useEffect(() => {
    if (stableReport === null) {
      return;
    }

    trackHighlights(stableReport);
  }, [stableReport]);

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
            report !== null && (
              <ReportCards report={report} hasPeople={hasPeople} />
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
};
