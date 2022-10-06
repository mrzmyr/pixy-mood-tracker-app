import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useLogs } from '../../hooks/useLogs';
import { useSegment } from '../../hooks/useSegment';
import { useStatistics } from '../../hooks/useStatistics';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { FeedbackSection } from './FeedbackSection';
import { HighlightsSection } from './HighlightsSection';

const MIN_LOGS_COUNT = 7;

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const statistics = useStatistics()
  const segment = useSegment()
  const { state } = useLogs()

  const [refreshing, setRefreshing] = useState(false);

  // times of the last two weeks
  const items = Object.values(state.items).filter(item => {
    const date = new Date(item.date)
    return date.getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 14
  })
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if(items.length >= MIN_LOGS_COUNT) {
        statistics.load({
          force: false
        })
      }
    });

    return unsubscribe;
  }, [navigation, JSON.stringify(items), statistics.isLoading]);
  
  useEffect(() => {
    if(statistics.isLoading === false) {
      setRefreshing(false)
    }
  }, [statistics.isLoading])
  
  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
        backgroundColor: colors.statisticsBackground
      }}
    >
      <ScrollView 
        style={{
          padding: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if(items.length >= MIN_LOGS_COUNT) {
                statistics.load({
                  force: true
                })
              }
            }}
          />
        }
      >
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          {/* <TrendsSection /> */}

          {items.length <= MIN_LOGS_COUNT && (
            <EmptyPlaceholder count={MIN_LOGS_COUNT - items.length + 1} />
          )}
          {items.length > MIN_LOGS_COUNT && (
            <HighlightsSection items={items} />
          )}

          {(
            items.length > MIN_LOGS_COUNT &&
            !statistics.isLoading
          ) && (
            <View
              style={{
                marginTop: 32,
                backgroundColor: colors.statisticsCardBackground,
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 8,
              }}
            >
              <FeedbackSection />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
