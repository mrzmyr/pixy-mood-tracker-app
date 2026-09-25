import { NotEnoughDataOverlay } from "@/components/Statistics/NotEnoughDataOverlay";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/hooks/useLogs";
import { RATING_MAPPING } from "@/constants/Ratings";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import groupBy from "lodash/groupBy";
import orderBy from "lodash/orderBy";
import sumBy from "lodash/sumBy";
import { Text, View } from "react-native";

export const WorstMonth = ({ date }: { date: Dayjs }) => {
  const colors = useColors();
  const logState = useLogState();

  const items = logState.items.flatMap((item) =>
    dayjs(item.dateTime).isSame(date, "year")
      ? [
          {
            ...item,
            month: dayjs(item.dateTime).format("YYYY-MM"),
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
  const [worstMonthByRatingValue] = orderBy(
    monthRatingValues,
    "ratingValue",
    "asc"
  );

  const month = worstMonthByRatingValue
    ? dayjs(worstMonthByRatingValue.month).format("MMMM")
    : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        minHeight: 80,
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
        {t("statistics_worst_month")}
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
