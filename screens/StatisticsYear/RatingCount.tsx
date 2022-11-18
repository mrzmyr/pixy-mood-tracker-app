import dayjs, { Dayjs } from "dayjs"
import { Text, View } from "react-native"
import { BigCard } from "../../components/BigCard"
import { t } from "../../helpers/translation"
import useColors from "../../hooks/useColors"
import { LogItem, RATING_KEYS } from "../../hooks/useLogs"
import useScale from "../../hooks/useScale"
import { CardFeedback } from "../Statistics/CardFeedback"

const Bar = ({
  height,
  ratingName,
}) => {
  const scale = useScale()

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        flex: RATING_KEYS.length,
        marginHorizontal: 2,
      }}
    >
      <View
        style={{
          height,
          width: '100%',
          backgroundColor: scale.colors[ratingName].background,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}
      />
    </View>
  )
}

export const RatingCount = ({
  date,
  items,
}: {
  date: Dayjs
  items: LogItem[]
}) => {
  const colors = useColors()

  const ratingCounts = RATING_KEYS.reduce((acc, ratingKey) => {
    acc[ratingKey] = items.filter(item => item.rating === ratingKey).length
    return acc
  }, {})

  const total = Object.values(ratingCounts).reduce((acc: number, count: number) => acc + count, 0)

  return (
    <BigCard
      title={t('mood_count')}
      subtitle={t('mood_count_description', { date: dayjs(date).format('YYYY') })}
      isShareable
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottomColor: colors.cardBorder,
          borderBottomWidth: 1,
          paddingHorizontal: 16,
          marginTop: 16,
        }}
      >
        {[...RATING_KEYS].reverse().map((ratingName) => (
          <Bar
            key={`rating-bar-${ratingName}`}
            // @ts-ignore
            height={ratingCounts[ratingName] / total * 400}
            ratingName={ratingName}
          />
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
        }}
      >
        {[...RATING_KEYS].reverse().map((ratingName) => (
          <View
            style={{
              alignItems: "center",
              justifyContent: "flex-end",
              flex: RATING_KEYS.length,
              marginHorizontal: 2,
            }}
          >
            <Text
              key={`text-${ratingName}`}
              style={{
                width: '100%',
                marginTop: 8,
                color: colors.text,
                opacity: ratingCounts[ratingName] === 0 ? 0.3 : 1,
                textAlign: "center",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >{ratingCounts[ratingName]}x</Text>
          </View>
        ))}
      </View>
      {/* <CardFeedback
        type="mood_count"
        details={{
          rating_counts: ratingCounts,
          total,
        }}
      /> */}
    </BigCard>
  )
}