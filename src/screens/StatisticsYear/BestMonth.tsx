import { BigCard } from "@/components/BigCard"
import { NotEnoughDataOverlay } from "@/components/Statistics/NotEnoughDataOverlay"
import { t } from "@/helpers/translation"
import useColors from "@/hooks/useColors"
import { RATING_MAPPING, useLogState } from "@/hooks/useLogs"
import dayjs, { Dayjs } from "dayjs"
import _ from 'lodash'
import { Text, View } from "react-native"

export const BestMonth = ({
  date,
}: {
  date: Dayjs,
}) => {
  const colors = useColors()
  const logState = useLogState()

  const items = logState.items.filter((item) => dayjs(item.dateTime).isSame(date, 'year'))
    .map((item) => ({
      ...item,
      month: dayjs(item.dateTime).format('YYYY-MM'),
      ratingValue: RATING_MAPPING[item.rating],
    }))

  const bestMonthByRatingValue = _.chain(items)
    .groupBy('month')
    .map((items, month) => ({
      month,
      ratingValue: _.sumBy(items, 'ratingValue'),
    }))
    .orderBy('ratingValue', 'desc')
    .first()
    .value()

  const month = bestMonthByRatingValue ? dayjs(bestMonthByRatingValue.month).format('MMMM') : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        position: 'relative',
      }}
    >
      {!month && <NotEnoughDataOverlay showSubtitle={false} />}
      <Text
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          fontWeight: '600',
          marginBottom: 8,
        }}
      >
        {t('statistics_best_month')}
      </Text>
      <Text
        style={{
          fontSize: 24,
          color: colors.text,
          fontWeight: 'bold',
        }}
      >
        {month}
      </Text>
    </View>
  )
}
