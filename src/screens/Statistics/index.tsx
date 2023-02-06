import { FeedbackBox } from '@/components/FeedbackBox';
import MenuList from '@/components/MenuList';
import MenuListHeadline from '@/components/MenuListHeadline';
import MenuListItem from '@/components/MenuListItem';
import { t } from '@/helpers/translation';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { Moon, Star } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { useStatistics } from '../../hooks/useStatistics';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { HighlightsSection } from './HighlightsSection';

import { DATE_FORMAT, STATISTIC_MIN_LOGS } from '@/constants/Config';
import isBetween from 'dayjs/plugin/isBetween';
import { RootStackScreenProps } from '../../../types';

dayjs.extend(isBetween);

export const StatisticsScreen = ({ navigation }: RootStackScreenProps<'Statistics'>) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const statistics = useStatistics()
  const logState = useLogState()

  const [refreshing, setRefreshing] = useState(false);

  // times of the last two weeks
  const items = logState.items.filter(item => {
    return dayjs(item.dateTime).isBetween(dayjs().subtract(14, 'day'), dayjs(), null, '[]')
  })

  const statisticsUnlocked = items.length >= STATISTIC_MIN_LOGS

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (items.length >= STATISTIC_MIN_LOGS) {
        statistics.load({
          force: false
        })
      }
    });

    return unsubscribe;
  }, [navigation, JSON.stringify(items), statistics.isLoading]);

  useEffect(() => {
    if (statistics.isLoading === false) {
      setRefreshing(false)
    }
  }, [statistics.isLoading])



  if (statistics.isLoading) {
    return (
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
    )
  }

  return (
    <ScrollView
      refreshControl={
        Platform.OS !== 'web' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (items.length >= STATISTIC_MIN_LOGS) {
                statistics.load({
                  force: true
                })
              }
            }}
          />
        ) : undefined
      }
      style={{
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {items.length < STATISTIC_MIN_LOGS && (
          <EmptyPlaceholder count={STATISTIC_MIN_LOGS - items.length} />
        )}

        {statisticsUnlocked && (
          <HighlightsSection items={items} />
        )}

        {(
          statisticsUnlocked
        ) && (
            <>
              <MenuListHeadline>{t('more_statistics')}</MenuListHeadline>
              <MenuList
                style={{
                }}
              >
                <MenuListItem
                  title={t('month_report')}
                  onPress={() => navigation.navigate('StatisticsMonth', { date: dayjs().startOf('month').format(DATE_FORMAT) })}
                  iconLeft={<Moon width={18} fill={colors.palette.indigo[500]} color={colors.palette.indigo[500]} />}
                  isLink
                />
                <MenuListItem
                  title={t('year_report')}
                  onPress={() => navigation.navigate('StatisticsYear', { date: dayjs().startOf('year').format(DATE_FORMAT) })}
                  iconLeft={<Star width={18} fill={colors.palette.amber[500]} color={colors.palette.amber[500]} />}
                  isLink
                  isLast
                />
              </MenuList>
            </>
          )}

      </View>
    </ScrollView>
  );
}
