import { Dayjs } from "dayjs"
import { LogItem, RATING_KEYS } from "@/hooks/useLogs"
import { CardFeedback } from "../CardFeedback"
import { NotEnoughDataOverlay } from "../NotEnoughDataOverlay"
import { BigCard } from "../../BigCard"
import { Content } from "./Content"

const MIN_ITEMS = 14

export const MoodCounts = ({
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
      hasFeedback
      analyticsId="rating-count"
    >
      {total < MIN_ITEMS && (
        <NotEnoughDataOverlay limit={MIN_ITEMS - total} />
      )}
      {total >= MIN_ITEMS ? (
        <Content
          data={data}
        />
      ) : (
        <Content
          data={dummyData}
        />
      )}
    </BigCard>
  )
}