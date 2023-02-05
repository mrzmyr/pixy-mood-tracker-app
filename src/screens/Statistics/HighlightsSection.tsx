import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { Activity } from "react-native-feather";
import { useAnalytics } from "../../hooks/useAnalytics";
import useColors from "../../hooks/useColors";
import { LogItem, useLogState } from "../../hooks/useLogs";
import { useStatistics } from "../../hooks/useStatistics";
import { MoodAvgData } from "../../hooks/useStatistics/MoodAvg";
import { EmotionsDistributionCard } from "./EmotionsDistributionCard";
import { MoodAvgCard } from "./MoodAvgCard";
import { MoodChart } from "./MoodChart";
import { MoodPeaksCard } from "./MoodPeaksCards";
import { SleepQualityChartCard } from "./SleepQualityGraph";
import { Subtitle } from "./Subtitle";
import { TagPeaksCard } from "./TagPeaksCards";
import { TagsDistributionCard } from "./TagsDistributionCard";
import { Title } from "./Title";

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
  )
}

export const HighlightsSection = ({ items }: { items: LogItem[] }) => {
  const colors = useColors();
  const navigation = useNavigation();
  const analytics = useAnalytics();
  const statistics = useStatistics();
  const logState = useLogState();

  const showMoodAvg = statistics.isHighlighted("mood_avg");
  const showMoodPeaksPositve = statistics.isHighlighted("mood_peaks_positive");
  const showMoodPeaksNegative = statistics.isHighlighted("mood_peaks_negative");
  const showTagPeaks = statistics.isHighlighted("tags_peaks");
  const showTagsDistribution = statistics.isAvailable("tags_distribution")
  const showEmotionsDistribution = statistics.isAvailable("emotions_distribution")
  const showMoodChart = logState.items.filter((item) => dayjs(item.dateTime).isAfter(dayjs().subtract(14, "day"))).length >= 4
  const showSleepQualityChart = statistics.isAvailable("sleep_quality_distribution")

  useEffect(() => {
    if (!statistics.state.loaded) return;

    const cards: {
      mood_avg_show: boolean;
      mood_avg_type?: MoodAvgData['ratingHighestKey']
      mood_avg_percentage?: MoodAvgData['ratingHighestPercentage']
      mood_peaks_positive_show: boolean;
      mood_peaks_positive_count?: number
      mood_peaks_negative_show: boolean;
      mood_peaks_negative_count?: number
      tags_peaks_show: boolean;
      tags_peaks_count?: number
      tags_distribution_show: boolean;
      tags_distribution_tag_count?: number;
      tags_distribution_item_count?: number
      mood_chart_show: boolean;
      mood_chart_item_count?: number
      emotions_distribution_show: boolean;
      emotions_distribution_item_count?: number
      sleep_quality_distribution_show: boolean;
    } = {
      mood_avg_show: showMoodAvg,
      mood_peaks_positive_show: showMoodPeaksPositve,
      mood_peaks_negative_show: showMoodPeaksNegative,
      tags_peaks_show: showTagPeaks,
      tags_distribution_show: showTagsDistribution,
      mood_chart_show: showMoodChart,
      emotions_distribution_show: showEmotionsDistribution,
      sleep_quality_distribution_show: showSleepQualityChart,
    }

    if (showMoodAvg) {
      cards.mood_avg_type = statistics.state.moodAvgData.ratingHighestKey
      cards.mood_avg_percentage = statistics.state.moodAvgData.ratingHighestPercentage
    }
    if (showMoodPeaksPositve) {
      cards.mood_peaks_positive_count = statistics.state.moodPeaksPositiveData.days.length
    }
    if (showMoodPeaksNegative) {
      cards.mood_peaks_negative_count = statistics.state.moodPeaksNegativeData.days.length
    }
    if (showTagPeaks) {
      cards.tags_peaks_count = statistics.state.tagsPeaksData.tags.length
    }
    if (showTagsDistribution) {
      cards.tags_distribution_tag_count = statistics.state.tagsDistributionData.tags.length
    }
    if (showMoodChart) {
      cards.mood_chart_item_count = logState.items.filter((item) => dayjs(item.dateTime).isAfter(dayjs().subtract(14, "day"))).length
    }
    if (showEmotionsDistribution) {
      cards.emotions_distribution_item_count = statistics.state.emotionsDistributionData.emotions.length
    }

    analytics.track('statistics_relevant_highlights', {
      itemsCount: statistics.state.itemsCount,
      ...cards
    })
  }, [JSON.stringify(statistics.state)])

  return (
    <>
      <Title>{t("statistics_highlights")}</Title>
      <Subtitle>{t("statistics_highlights_description")}</Subtitle>

      <View
        style={{
          flex: 1,
        }}
      >
        {(
          !showMoodAvg &&
          !showMoodPeaksPositve &&
          !showMoodPeaksNegative &&
          !showTagPeaks &&
          !showTagsDistribution &&
          !showMoodChart
        ) && (
            <EmptryState />
          )}

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
          <TagsDistributionCard
            data={statistics.state.tagsDistributionData}
          />
        )}

        {showTagPeaks && (
          <>
            {statistics.state.tagsPeaksData.tags
              .sort((a, b) => b.items.length - a.items.length)
              .filter((tag) => tag.items.length > 5)
              .map((tag, index) => (
                <TagPeaksCard key={index} tag={tag} />
              ))}
          </>
        )}

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
            iconLeft={
              <Activity
                width={18}
                height={18}
                color={colors.text}
              />
            }
          />
        </MenuList>
      </View>
    </>
  );
};
