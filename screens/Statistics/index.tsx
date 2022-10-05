import { useNavigationState } from '@react-navigation/native';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useLogs } from '../../hooks/useLogs';
import { useSegment } from '../../hooks/useSegment';
import { useStatistics } from '../../hooks/useStatistics';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { FeedbackSection } from './FeedbackSection';
import { MoodAvgCard } from './MoodAvgCard';
import { MoodPeaksCard } from './MoodPeaksCards';
import { TagPeaksCards } from './TagPeaksCards';
import { TagsDistributionCard } from './TagsDistributionCard';

const MIN_LOGS_COUNT = 7;

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { t } = useTranslation();
  const statistics = useStatistics()
  const segment = useSegment()
  const { state } = useLogs()

  // times of the last two weeks
  const items = Object.values(state.items).filter(item => {
    const date = new Date(item.date)
    return date.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 14
  })
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if(items.length >= MIN_LOGS_COUNT) {
        statistics.load()
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const cards = []

    if(statistics.isAvailable('mood_avg')) cards.push('mood_avg')
    if(statistics.isAvailable('mood_peaks_positive')) cards.push('mood_peaks_positive')
    if(statistics.isAvailable('mood_peaks_negative')) cards.push('mood_peaks_negative')
    if(statistics.isAvailable('tags_distribution')) cards.push('tags_distribution')
    if(statistics.isAvailable('tag_peaks')) cards.push('tag_peaks')
    
    segment.track('statistics_view', {
      itemsCount: items.length,
      cards
    })
  }, [JSON.stringify(statistics.state)])
  
  return (
    <View
      style={{
        paddingTop: insets.top,
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
          <Text
            style={{
              fontSize: 24,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 16,
            }}
          >{t('statistics_subtitle')}</Text>
          <Text
            style={{
              letterSpacing: -0.1,
              fontSize: 17,
              color: colors.textSecondary,
              marginTop: 8,
            }}
          >{t('statistics_description')}</Text>

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
              {items.length < MIN_LOGS_COUNT ? (
                <EmptyPlaceholder count={MIN_LOGS_COUNT - items.length} />
              ) : (
                <>
                  {items.length >= MIN_LOGS_COUNT && (
                    <View
                      style={{
                        marginTop: 16,
                        backgroundColor: colors.statisticsCardBackground,
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                      }}
                    >
                      <FeedbackSection />
                    </View>
                  )}

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
                    <TagPeaksCards data={statistics.state.tagsPeaksData} />
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
