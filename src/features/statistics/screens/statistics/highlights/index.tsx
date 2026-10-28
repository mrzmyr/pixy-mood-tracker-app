import { useEffect, useEffectEvent } from "react";
import { useContentStableValue } from "@/hooks/use-content-stable-value";
import { ScrollView, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useAnalytics } from "@/state/analytics";
import type { HighlightsProperties } from "@/state/analytics/events";
import type { HighlightsReport } from "../../../highlights-report";
import { useHighlightsReport } from "../../../use-highlights-report";
import { MoodAvgCard } from "../mood-avg-card";
import { MoodPeaksCard } from "../mood-peaks-cards";
import { TagPeaksCard } from "../tag-peaks-cards";
import { TagsDistributionCard } from "../tags-distribution-card";
import { Title } from "../title";
import { t } from "@/lib/translation";
import { MoodChart } from "../mood-chart";
import { SleepQualityChartCard } from "../sleep-quality-graph";
import { useFeatureFlag } from "@/state/feature-flags";
import { PeopleHighlights } from "../people-highlights";
import {
  getPeopleHighlightProperties,
  getPeopleHighlightsState,
} from "../people-highlights-state";

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
 * report.
 */
export const StatisticsHighlights = () => {
  const paddingBottom = useScrollBottomPadding(20);
  const colors = useColors();
  const analytics = useAnalytics();
  const report = useHighlightsReport();

  const hasPeople = useFeatureFlag("people");

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
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom }}
      >
        <View
          style={{
            flex: 1,
            paddingBottom: 30,
          }}
        >
          <Title>{t("statistics_2_week_highlights")}</Title>

          <ReportCards report={report} hasPeople={hasPeople} />
        </View>
      </ScrollView>
    </View>
  );
};
