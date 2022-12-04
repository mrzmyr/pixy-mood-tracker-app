import { PromoCardMonth } from "@/components/PromoCardMonth";
import { PromoCardYear } from "@/components/PromoCardYear";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import React from "react";
import { View } from "react-native";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";

export const PromoCards = () => {
  const navigation = useNavigation();
  const logState = useLogState();
  const colors = useColors();

  const isBeginningOfMonth = dayjs().isBetween(dayjs().startOf('month'), dayjs().startOf('month').add(3, 'day'), null, '[]');
  const isDecember = dayjs().month() === 11;
  const enoughtLogsForYearPromo = logState.items.length > 30;
  const hasYearPromo = enoughtLogsForYearPromo && isDecember;

  return (
    <>
      {(
        logState.items.length >= STATISTIC_MIN_LOGS &&
        hasYearPromo || isBeginningOfMonth
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
                borderTopColor: colors.cardBorder,
                borderTopWidth: 1,
                paddingTop: 24,
                marginTop: 24,
              }}
            >
              {hasYearPromo && (
                <View
                  style={{}}
                >
                  <PromoCardYear
                    title={t('promo_card_year_title', { year: dayjs().format('YYYY') })}
                    onPress={() => navigation.navigate('StatisticsYear', { date: dayjs().startOf('year').format(DATE_FORMAT) })} />
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
                    onPress={() => navigation.navigate('StatisticsMonth', { date: dayjs().subtract(1, 'month').startOf('month').format(DATE_FORMAT) })} />
                </View>
              )}
            </View>
          </>
        )}
    </>
  );
};
