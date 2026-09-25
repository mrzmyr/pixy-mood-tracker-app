import type { Dayjs } from "dayjs";
import type { LogItem } from "@/features/logs";
import { RATING_KEYS } from "@/constants/Ratings";
import { NotEnoughDataOverlay } from "../NotEnoughDataOverlay";
import { BigCard } from "../../BigCard";
import { Content } from "./Content";

const MIN_ITEMS = 14;

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
};

/**
 * Shareable card counting entries per rating in `items`. Below 14 entries
 * it shows placeholder bars behind the "not enough data" overlay. `date`
 * is currently unused.
 */
export const MoodCounts = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  date: Dayjs;
  items: LogItem[];
}) => {
  const ratingCounts: {
    [key: string]: number;
  } = {};
  for (const ratingKey of RATING_KEYS) {
    ratingCounts[ratingKey] = items.filter(
      (item) => item.rating === ratingKey
    ).length;
  }

  const total =
    Object.values(ratingCounts).reduce(
      (acc: number, count: number) => acc + count,
      0
    ) || 0;

  const data = {
    values: ratingCounts,
    total,
  };

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      hasFeedback
      analyticsId="rating-count"
    >
      {total < MIN_ITEMS && <NotEnoughDataOverlay limit={MIN_ITEMS - total} />}
      {total >= MIN_ITEMS ? (
        <Content data={data} />
      ) : (
        <Content data={dummyData} />
      )}
    </BigCard>
  );
};
