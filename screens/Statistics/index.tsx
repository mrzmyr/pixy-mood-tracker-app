import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Moon, Star } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuList from '../../components/MenuList';
import MenuListHeadline from '../../components/MenuListHeadline';
import MenuListItem from '../../components/MenuListItem';
import { PromoCardMonth } from '../../components/PromoCardMonth';
import { PromoCardYear } from '../../components/PromoCardYear';
import { t } from '../../helpers/translation';
import useColors from '../../hooks/useColors';
import { useLogState } from '../../hooks/useLogs';
import { useStatistics } from '../../hooks/useStatistics';
import { EmptyPlaceholder } from './EmptyPlaceholder';
import { FeedbackSection } from './FeedbackSection';
import { HighlightsSection } from './HighlightsSection';

import isBetween from 'dayjs/plugin/isBetween';
import { DATE_FORMAT } from '../../constants/Config';
import { RootStackScreenProps } from '../../types';
import { useNavigation } from '@react-navigation/native';

dayjs.extend(isBetween);

const MIN_LOGS_COUNT = 7;

const PromoCards = () => {
  const navigation = useNavigation();
  const logState = useLogState()
  const isBeginningOfMonth = dayjs().isBetween(dayjs().startOf('month'), dayjs().startOf('month').add(3, 'day'), null, '[]')
  const isDecember = dayjs().month() === 11

  const items = Object.values(logState.items);

  return (
    <>
      {(
        items.length >= MIN_LOGS_COUNT &&
        isDecember || isBeginningOfMonth
      ) && (
          <>
            {/* <View
          style={{
            marginTop: 16,
          }}
        >
          <StreaksCard />
        </View> */}
            <View
              style={{
                marginBottom: 16,
              }}
            >
              {isDecember && (
                <View
                  style={{
                  }}
                >
                  <PromoCardYear
                    title={t('promo_card_year_title', { year: dayjs().format('YYYY') })}
                    onPress={() => navigation.navigate('StatisticsYear', { date: dayjs().startOf('year').format(DATE_FORMAT) })}
                  />
                </View>
              )}
              {isBeginningOfMonth && (
                <View
                  style={{
                    marginTop: isDecember ? 16 : 0,
                  }}
                >
                  <PromoCardMonth
                    title={t('promo_card_month_title', { month: dayjs().subtract(1, 'month').format('MMMM') })}
                    onPress={() => navigation.navigate('StatisticsMonth', { date: dayjs().subtract(1, 'month').startOf('month').format(DATE_FORMAT) })}
                  />
                </View>
              )}
            </View>
          </>
        )}
    </>
  )
};

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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (items.length >= MIN_LOGS_COUNT) {
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
              if (items.length >= MIN_LOGS_COUNT) {
                statistics.load({
                  force: true
                })
              }
            }}
          />
        ) : undefined
      }
    >
      <View
        style={{
          backgroundColor: colors.background,
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* <Text
            style={{
              fontSize: 32,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 32,
            }}
          >{t('statistics')}</Text> */}



        {/* <TrendsSection /> */}

        <PromoCards />

        {items.length < MIN_LOGS_COUNT && (
          <EmptyPlaceholder count={MIN_LOGS_COUNT - items.length} />
        )}
        {items.length >= MIN_LOGS_COUNT && (
          <HighlightsSection items={items} />
        )}

        {(
          items.length >= MIN_LOGS_COUNT
        ) && (
            <>
              <FeedbackSection />
            </>
          )}

        {(
          items.length >= MIN_LOGS_COUNT
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
