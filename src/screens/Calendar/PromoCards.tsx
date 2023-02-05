import { PromoCard } from "@/components/PromoCard";
import { MONTH_REPORT_SLUG, PromoCardMonth } from "@/components/PromoCardMonth";
import { PromoCardYear, YEAR_REPORT_SLUG } from "@/components/PromoCardYear";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSettings } from "@/hooks/useSettings";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import React, { ReactElement, useEffect, useState } from "react";
import { View } from "react-native";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
import * as rssParser from 'react-native-rss-parser';
import * as WebBrowser from 'expo-web-browser';

type RssItem = {
  title: string,
  links: {
    url: string,
    rel: string,
  }[],
  description: string,
  id: string,
  authors: string[],
  categories: string[],
  published: string,
  enclosures: string[],
  itunes: {
    authors: string[],
  }
  slug: string,
}

export const PromoCards = () => {
  const navigation = useNavigation();
  const logState = useLogState();
  const analytics = useAnalytics();
  const colors = useColors();
  const { hasActionDone } = useSettings()

  const statisticsUnlocked = logState.items.length >= STATISTIC_MIN_LOGS;
  const isBeginningOfMonth = dayjs().isBetween(dayjs().startOf('month'), dayjs().startOf('month').add(3, 'day'), null, '[]');
  const isDecember = dayjs().month() === 11;
  const enoughtLogsForYearPromo = logState.items.length > 30;

  const hasMonthPromo = isBeginningOfMonth && statisticsUnlocked && !hasActionDone(MONTH_REPORT_SLUG)
  const hasYearPromo = enoughtLogsForYearPromo && isDecember && statisticsUnlocked && !hasActionDone(YEAR_REPORT_SLUG)
  const hasSleepTrackingPromo = logState.items.length > 4 && !hasActionDone('promo_sleep_tracking_closed')

  const [mostRecentRssItem, setMostRecentRssItem] = useState<RssItem | null>(null)

  const hasMostRecentRssItem = !!mostRecentRssItem && !hasActionDone(mostRecentRssItem.slug)

  useEffect(() => {
    fetch('https://pixy.hellonext.co/rss/changelog.xml')
      .then(response => response.text())
      .then(str => rssParser.parse(str))
      .then(rss => {
        const items = rss.items
          .filter(item => dayjs(item.published).isAfter('2023-01-09'))
          .map(item => ({
            ...item,
            slug: item.id.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
          }))

        if (items.length !== 0) {
          setMostRecentRssItem(items[0])
        }
      })
  }, [])

  const promoCards: ReactElement[] = []

  if (hasMonthPromo) {
    promoCards.push(
      <PromoCardMonth
        title={t('promo_card_month_title', { month: dayjs().subtract(1, 'month').format('MMMM') })}
        onPress={() => navigation.navigate('StatisticsMonth', { date: dayjs().subtract(1, 'month').startOf('month').format(DATE_FORMAT) })}
      />
    )
  }

  if (hasYearPromo) {
    promoCards.push(
      <PromoCardYear
        title={t('promo_card_year_title', { year: dayjs().format('YYYY') })}
        onPress={() => navigation.navigate('StatisticsYear', { date: dayjs().startOf('year').format(DATE_FORMAT) })}
      />
    )
  }

  if (hasSleepTrackingPromo) {
    promoCards.push(
      <PromoCard
        slug="promo_sleep_tracking_closed"
        subtitle={t('new_feature')}
        title={t('promo_sleep_tracking_title')}
        onPress={() => {
          analytics.track('promo_sleep_tracking_clicked')
          navigation.navigate("Steps");
        }}
      />
    )
  }

  if (hasMostRecentRssItem) {
    promoCards.push(
      <PromoCard
        colorName="pink"
        slug={mostRecentRssItem.slug}
        subtitle={t('new_release')}
        title={mostRecentRssItem.title}
        onPress={() => {
          analytics.track('promo_changelog_clicked')
          WebBrowser.openBrowserAsync(mostRecentRssItem.id);
        }}
      />
    )
  }

  if (promoCards.length === 0) return null;

  return (
    <View
      style={{
        borderTopColor: colors.cardBorder,
        borderTopWidth: 1,
        marginTop: 24,
        paddingTop: 24,
      }}
    >
      {promoCards.map((promoCard, index) => (
        <View
          key={`promo-card-${index}`}
          style={{
            marginTop: index === 0 ? 0 : 16,
          }}
        >
          {promoCard}
        </View>
      ))}
    </View>
  );
};
