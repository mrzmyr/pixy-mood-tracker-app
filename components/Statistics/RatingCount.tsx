import { Dayjs } from "dayjs"
import { Text, View } from "react-native"
import useColors from "../../hooks/useColors"
import { LogItem, RATING_KEYS } from "../../hooks/useLogs"
import useScale from "../../hooks/useScale"
import { CardFeedback } from "../../screens/Statistics/CardFeedback"
import { NotEnoughDataOverlay } from "../../screens/StatisticsMonth/NotEnoughDataOverlay"
import { BigCard } from "../BigCard"

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

const RatingCountContent = ({
  data,
}: {
  data: {
    values: {
      [key: string]: number
    },
    total: number,
  }
}) => {
  const colors = useColors()

  return (
    <>
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
            height={data.values[ratingName] / data.total * 400}
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
            key={`rating-count-${ratingName}`}
          >
            <Text
              key={`text-${ratingName}`}
              style={{
                width: '100%',
                marginTop: 8,
                color: colors.text,
                opacity: data.values[ratingName] === 0 ? 0.3 : 1,
                textAlign: "center",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >{data.values[ratingName]}x</Text>
          </View>
        ))}
      </View>
    </>
  )
}

export const RatingCount = ({
  title,
  subtitle,
  date,
  items,
}: {
  title: string,
  subtitle: string,
  date: Dayjs
  items: LogItem[]
}) => {
  const ratingCounts: {
    [key: string]: number
  } = RATING_KEYS.reduce((acc, ratingKey) => {
    acc[ratingKey] = items.filter(item => item.rating === ratingKey).length
    return acc
  }, {})

  const total = Object.values(ratingCounts).reduce((acc: number, count: number) => acc + count, 0) || 0

  const data = {
    values: ratingCounts,
    total,
  }

  const dummyData = {
    values: {
      extremely_bad: 2,
      very_bad: 1,
      bad: 2,
      neutral: 4,
      good: 3,
      very_good: 5,
      extremely_good: 1,
    },
    total: 18,
  }

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      analyticsId="rating-count"
    >
      {total < 1 && (
        <NotEnoughDataOverlay />
      )}
      {total > 14 ? (
        <RatingCountContent
          data={data}
        />
      ) : (
        <RatingCountContent
          data={dummyData}
        />
      )}
      <CardFeedback
        type="mood_count"
        details={{
          rating_counts: ratingCounts,
          total,
        }}
      />
    </BigCard>
  )
}