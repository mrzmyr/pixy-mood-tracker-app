import dayjs from "dayjs";
import { Dimensions, View } from "react-native";
import { Card } from "../../components/Card";
import { getCardChartWidth } from "../../components/cardChartWidth";
import { t } from "@/lib/translation";
import { useLogState } from "@/features/logs";
import { getRatingDistributionForXDays } from "../../RatingDistribution";

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { RatingChart } from "../../components/RatingChart";
import { getItemTime } from "@/lib/logDates";

dayjs.extend(isSameOrAfter);

/** Mood line chart for 15 days from `startDate` (`YYYY-MM-DD`). */
export const MoodChart = ({
  title,
  startDate,
}: {
  title: string;
  startDate?: string;
}) => {
  const logState = useLogState();

  const startTime = dayjs(startDate).valueOf();
  const items = logState.items.filter((item) => getItemTime(item) >= startTime);

  const data = getRatingDistributionForXDays(items, startDate, 14);

  const width = getCardChartWidth(Dimensions.get("window").width);
  const height = width / 2.5;

  return (
    <Card subtitle={t("mood")} title={title}>
      <View
        style={{
          justifyContent: "flex-start",
        }}
      >
        <RatingChart data={data} height={height} width={width} />
      </View>
    </Card>
  );
};
