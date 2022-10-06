import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Activity } from "react-native-feather";
import MenuList from "../../components/MenuList";
import MenuListItem from "../../components/MenuListItem";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";
import { useSegment } from "../../hooks/useSegment";
import { useStatistics } from "../../hooks/useStatistics";
import { useTranslation } from "../../hooks/useTranslation";
import { MoodAvgCard } from "./MoodAvgCard";
import { MoodPeaksCard } from "./MoodPeaksCards";
import { Subtitle } from "./Subtitle";
import { TagPeaksCard } from "./TagPeaksCards";
import { TagsDistributionCard } from "./TagsDistributionCard";
import { Title } from "./Title";

export const HighlightsSection = ({ items }: { items: LogItem[] }) => {
  const colors = useColors();
  const navigation = useNavigation();
  const segment = useSegment();
  const statistics = useStatistics();
  const { t } = useTranslation();
  
  const showMoodAvg =
    statistics.isAvailable("mood_avg") &&
    statistics.state.moodAvgData.ratingHighestPercentage > 60;

  const showMoodPeaksPositve =
    statistics.isAvailable("mood_peaks_positive") &&
    statistics.state.moodPeaksPositiveData.items.length >= 2;

  const showMoodPeaksNegative =
    statistics.isAvailable("mood_peaks_negative") &&
    statistics.state.moodPeaksNegativeData.items.length >= 2;

  const showTagPeaks =
    statistics.isAvailable("tags_peaks") &&
    statistics.state.tagsPeaksData.tags.filter((tag) => tag.items.length > 5).length > 0;

  const showTagsDistribution =
    statistics.isAvailable("tags_distribution") &&
    statistics.state.tagsDistributionData.itemsCount >= 10;

  useEffect(() => {
    const cards: {
      mood_avg?: number;
      mood_peaks_positive?: number
      mood_peaks_negative?: number
      tags_peaks?: number
      tags_distribution?: number
    } = {}

    if(showMoodAvg) cards.mood_avg = statistics.state.moodAvgData.ratingHighestPercentage
    if(showMoodPeaksPositve) cards.mood_peaks_positive = statistics.state.moodPeaksPositiveData.items.length
    if(showMoodPeaksNegative) cards.mood_peaks_negative = statistics.state.moodPeaksNegativeData.items.length
    if(showTagPeaks) cards.tags_peaks = statistics.state.tagsPeaksData.tags.length
    if(showTagsDistribution) cards.tags_distribution = statistics.state.tagsDistributionData.itemsCount
    
    segment.track('statistics_relevant_highlights', {
      itemsCount: items.length,
      ...cards
    })
  }, [JSON.stringify(statistics.state)])
    
  return (
    <>
      <Title>{t("statistics_highlights")}</Title>
      <Subtitle>{t("statistics_highlights_description")}</Subtitle>

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
          {(
            !showMoodAvg &&
            !showMoodPeaksPositve &&
            !showMoodPeaksNegative &&
            !showTagPeaks && 
            !showTagsDistribution
          ) && (
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
          )}

          {showMoodAvg && <MoodAvgCard data={statistics.state.moodAvgData} />}

          {showMoodPeaksPositve && (
            <MoodPeaksCard
              data={statistics.state.moodPeaksPositiveData}
              type="positive"
            />
          )}

          {showMoodPeaksNegative && (
            <MoodPeaksCard
              data={statistics.state.moodPeaksNegativeData}
              type="negative"
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
                  color={colors.palette.amber[500]}
                />
              }
            />
          </MenuList>
        </>
      )}
    </>
  );
};
