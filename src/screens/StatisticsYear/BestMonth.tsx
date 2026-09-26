import { NotEnoughDataOverlay } from "@/features/statistics/components/NotEnoughDataOverlay";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import { RATING_MAPPING } from "@/constants/Ratings";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import groupBy from "lodash/groupBy";
import orderBy from "lodash/orderBy";
import sumBy from "lodash/sumBy";
import { Text, View } from "react-native";
import { getItemDate } from "@/lib/logDates";

/**
 * Best month of the year of `date`.
 *
 * Ranks months by the sum of rating values, not the mean, so months with
 * more entries rank higher.
 */
export const BestMonth = ({ date }: { date: Dayjs }) => {
  const colors = useColors();
  const logState = useLogState();

  const year = date.format("YYYY");
  const items = logState.items.flatMap((item) =>
    getItemDate(item).startsWith(year)
      ? [
          {
            ...item,
            month: getItemDate(item).slice(0, 7),
            ratingValue: RATING_MAPPING[item.rating],
          },
        ]
      : []
  );

  const monthRatingValues = Object.entries(groupBy(items, "month")).map(
    ([month, monthItems]) => ({
      month,
      ratingValue: sumBy(monthItems, "ratingValue"),
    })
  );
  const [bestMonthByRatingValue] = orderBy(
    monthRatingValues,
    "ratingValue",
    "desc"
  );

  const month = bestMonthByRatingValue
    ? dayjs(bestMonthByRatingValue.month).format("MMMM")
    : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        position: "relative",
      }}
    >
      {!month && <NotEnoughDataOverlay showSubtitle={false} />}
      <Text
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        {t("statistics_best_month")}
      </Text>
      <Text
        style={{
          fontSize: 24,
          color: colors.text,
          fontWeight: "bold",
        }}
      >
        {month}
      </Text>
    </View>
  );
};
