import { PromoCard } from "@/components/PromoCard";
import { MONTH_REPORT_SLUG, PromoCardMonth } from "@/components/PromoCardMonth";
import { PromoCardYear, YEAR_REPORT_SLUG } from "@/components/PromoCardYear";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useSettings } from "@/hooks/useSettings";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import React, { ReactElement } from "react";
import { View } from "react-native";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";

export const PromoCards = () => {
  const navigation = useNavigation();
  const logState = useLogState();
  const statisticsUnlocked = logState.items.length >= STATISTIC_MIN_LOGS;
  const colors = useColors();
  const { hasActionDone } = useSettings()

  const isBeginningOfMonth = dayjs().isBetween(dayjs().startOf('month'), dayjs().startOf('month').add(3, 'day'), null, '[]');
  const isDecember = dayjs().month() === 11;
  const enoughtLogsForYearPromo = logState.items.length > 30;

  const hasMonthPromo = isBeginningOfMonth && statisticsUnlocked && !hasActionDone(MONTH_REPORT_SLUG)
  const hasYearPromo = enoughtLogsForYearPromo && isDecember && statisticsUnlocked && !hasActionDone(YEAR_REPORT_SLUG)
  const hasEmotionTrackingPromo = logState.items.length > 4 && !hasActionDone('promo_emotions_tracking_closed')

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

  if (hasEmotionTrackingPromo) {
    promoCards.push(
      <PromoCard
        slug="promo_emotions_tracking_closed"
        subtitle={t('new_feature')}
        title={t('promo_emotion_tracking_title')}
        onPress={() => {
          navigation.navigate("Steps");
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
