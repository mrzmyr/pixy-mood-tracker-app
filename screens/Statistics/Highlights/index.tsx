import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../../hooks/useColors';
import { useSegment } from '../../../hooks/useSegment';
import { useStatistics } from '../../../hooks/useStatistics';
import { useTranslation } from '../../../hooks/useTranslation';
import { MoodAvgCard } from '../MoodAvgCard';
import { MoodPeaksCard } from '../MoodPeaksCards';
import { TagPeaksCard } from '../TagPeaksCards';
import { TagsDistributionCard } from '../TagsDistributionCard';
import { Title } from '../Title';

export const StatisticsHighlights = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const segment = useSegment();
  const { t } = useTranslation();
  const statistics = useStatistics()
  
  useEffect(() => {
    const cards: {
      mood_avg?: number;
      mood_peaks_positive?: number
      mood_peaks_negative?: number
      tags_peaks?: number
      tags_distribution?: number
    } = {}

    if(statistics.isAvailable('mood_avg')) cards.mood_avg = statistics.state.moodAvgData.ratingHighestPercentage
    if(statistics.isAvailable('mood_peaks_positive')) cards.mood_peaks_positive = statistics.state.moodPeaksPositiveData.items.length
    if(statistics.isAvailable('mood_peaks_negative')) cards.mood_peaks_negative = statistics.state.moodPeaksNegativeData.items.length
    if(statistics.isAvailable('tags_distribution')) cards.tags_peaks = statistics.state.tagsPeaksData.tags.length
    if(statistics.isAvailable('tags_peaks')) cards.tags_distribution = statistics.state.tagsDistributionData.itemsCount
    
    segment.track('statistics_all_highlights', cards)
  }, [JSON.stringify(statistics.state)])
  
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground
      }}
    >
      <ScrollView style={{
        padding: 20,
      }}>
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          <Title>{t('statistics_2_week_highlights')}</Title>

          {statistics.isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 32,
              }}
            > 
              <ActivityIndicator />
            </View>
          ) : (
            <>
              {statistics.isAvailable('mood_avg') && (
                <MoodAvgCard data={statistics.state.moodAvgData} />
              )}

              {statistics.isAvailable('mood_peaks_positive') && (
                <MoodPeaksCard data={statistics.state.moodPeaksPositiveData} type="positive" />
              )}

              {statistics.isAvailable('mood_peaks_negative') && (
                <MoodPeaksCard data={statistics.state.moodPeaksNegativeData} type="negative" />
              )}

              {statistics.isAvailable('tags_distribution') && (
                <TagsDistributionCard data={statistics.state.tagsDistributionData} />
              )}

              {statistics.isAvailable('tags_peaks') && (
                <>
                  {statistics.state.tagsPeaksData.tags.map((tag, index) => <TagPeaksCard key={index} tag={tag} />)}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
