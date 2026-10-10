import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { useRouter } from "expo-router";
import { t } from "@/lib/translation";
import { useEffect, useEffectEvent } from "react";
import type { ReactElement } from "react";

import { useContentStableValue } from "@/hooks/useContentStableValue";
import { Text, View } from "react-native";
import { Activity } from "react-native-feather";
import { useAnalytics } from "@/state/analytics";
import type { HighlightsProperties } from "@/state/analytics/events";
import useColors from "@/hooks/useColors";

import { isTagPeakHighlighted } from "../../highlightsReport";
import type { HighlightsReport } from "../../highlightsReport";
import { EmotionsDistributionCard } from "./EmotionsDistributionCard";
import { MoodAvgCard } from "./MoodAvgCard";
import { MoodChart } from "./MoodChart";
import { MoodPeaksCard } from "./MoodPeaksCards";
import { SleepQualityChartCard } from "./SleepQualityGraph";
import { Subtitle } from "./Subtitle";
import { TagPeaksCard } from "./TagPeaksCards";
import { TagsDistributionCard } from "./TagsDistributionCard";
import { Title } from "./Title";
import { useFeatureFlag } from "@/state/featureFlags";
import { PeopleHighlights } from "./PeopleHighlights";
import {
  getPeopleHighlightProperties,
  getPeopleHighlightsState,
} from "./peopleHighlightsState";

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

/**
 * Highlight cards on the Statistics tab, short list of `report`.
 */
export const HighlightsSection = ({ report }: { report: HighlightsReport }) => {
  const colors = useColors();
  const router = useRouter();
  const analytics = useAnalytics();
  const { cards, data, window } = report;

  const showMoodAvg = cards.mood_avg.highlighted;
  const showMoodPeaksPositve = cards.mood_peaks_positive.highlighted;
  const showMoodPeaksNegative = cards.mood_peaks_negative.highlighted;
  const showTagPeaks = cards.tags_peaks.highlighted;
  const showTagsDistribution = cards.tags_distribution.available;
  const showEmotionsDistribution = cards.emotions_distribution.available;
  const showMoodChart = cards.mood_chart.available;
  const showSleepQualityChart = cards.sleep_quality_distribution.available;
  const hasPeople = useFeatureFlag("people");
  const peopleHighlights = getPeopleHighlightsState({
    hasPeople,
    highlightedOnly: true,
    cards,
  });

  // Effect event: tracks with the latest visibility flags and analytics, but
  // only when the report content changes (see the effect below).
  const trackHighlights = useEffectEvent((tracked: HighlightsReport) => {
    const highlights: HighlightsProperties = {
      items_count: tracked.itemsCount,
      mood_avg_show: showMoodAvg,
      mood_peaks_positive_show: showMoodPeaksPositve,
      mood_peaks_negative_show: showMoodPeaksNegative,
      tags_peaks_show: showTagPeaks,
      tags_distribution_show: showTagsDistribution,
      mood_chart_show: showMoodChart,
      emotions_distribution_show: showEmotionsDistribution,
      sleep_quality_distribution_show: showSleepQualityChart,
    };

    if (showMoodPeaksPositve) {
      highlights.mood_peaks_positive_count =
        data.moodPeaksPositiveData.days.length;
    }
    if (showMoodPeaksNegative) {
      highlights.mood_peaks_negative_count =
        data.moodPeaksNegativeData.days.length;
    }
    if (showTagPeaks) {
      highlights.tags_peaks_count = data.tagsPeaksData.tags.length;
    }
    if (showTagsDistribution) {
      highlights.tags_distribution_tag_count =
        data.tagsDistributionData.tags.length;
    }
    if (showMoodChart) {
      highlights.mood_chart_item_count = tracked.itemsCount;
    }
    if (showEmotionsDistribution) {
      highlights.emotions_distribution_item_count =
        data.emotionsDistributionData.emotions.length;
    }
    Object.assign(
      highlights,
      getPeopleHighlightProperties({
        hasPeople,
        state: peopleHighlights,
        distribution: data.peopleDistributionData,
        peaks: data.peoplePeaksData,
      })
    );

    analytics.track("statistics:highlights_viewed", highlights);
  });

  // Stays referentially equal while the report content is unchanged.
  const stableReport = useContentStableValue(report);

  useEffect(() => {
    trackHighlights(stableReport);
  }, [stableReport]);

  const tagPeaksCards: ReactElement[] = [];
  if (showTagPeaks) {
    for (const tag of data.tagsPeaksData.tags) {
      if (isTagPeakHighlighted(tag)) {
        tagPeaksCards.push(
          <TagPeaksCard
            key={tag.id}
            tag={tag}
            startDate={window.start}
            endDate={window.end}
          />
        );
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
          !peopleHighlights.showDistribution &&
          !showMoodChart && <EmptryState />}

        {showMoodChart && (
          <MoodChart
            title={t("statistics_mood_chart_highlights_title")}
            startDate={window.start}
          />
        )}

        {showSleepQualityChart && (
          <SleepQualityChartCard
            title={t("statistics_sleep_quality_chart_highlights_title")}
            startDate={window.start}
          />
        )}

        {showMoodChart && (
          <EmotionsDistributionCard data={data.emotionsDistributionData} />
        )}

        {showMoodAvg && <MoodAvgCard data={data.moodAvgData} />}

        {showMoodPeaksPositve && (
          <MoodPeaksCard
            data={data.moodPeaksPositiveData}
            type="positive"
            startDate={window.start}
            endDate={window.end}
          />
        )}

        {showMoodPeaksNegative && (
          <MoodPeaksCard
            data={data.moodPeaksNegativeData}
            type="negative"
            startDate={window.start}
            endDate={window.end}
          />
        )}

        {showTagsDistribution && (
          <TagsDistributionCard data={data.tagsDistributionData} />
        )}

        {showTagPeaks && tagPeaksCards}

        <PeopleHighlights
          state={peopleHighlights}
          distribution={data.peopleDistributionData}
          peaks={data.peoplePeaksData}
        />

        <MenuList
          style={{
            marginTop: 16,
          }}
        >
          <MenuListItem
            title={t("statistics_highlights_more")}
            isLink
            onPress={() => router.push("/statistics/highlights")}
            iconLeft={<Activity width={18} height={18} color={colors.text} />}
          />
        </MenuList>
      </View>
    </>
  );
};
