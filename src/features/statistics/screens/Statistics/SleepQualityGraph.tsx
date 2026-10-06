import { Card } from "../../components/Card";
import { getCardChartWidth } from "../../components/cardChartWidth";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { Dimensions, View } from "react-native";
import { useLogState } from "@/features/logs";

import { SleepQualityChart } from "../../components/SleepQualityChart";
import { getSleepQualityDistributionForXDays } from "../../SleepQualityDistribution";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { getItemTime } from "@/lib/logDates";

dayjs.extend(isSameOrAfter);

/** Sleep quality line chart for 15 days from `startDate` (`YYYY-MM-DD`). */
export const SleepQualityChartCard = ({
  title,
  startDate,
}: {
  title: string;
  startDate: string;
}) => {
  const logState = useLogState();

  const startTime = dayjs(startDate).valueOf();
  const items = logState.items.filter((item) => getItemTime(item) >= startTime);

  const data = getSleepQualityDistributionForXDays(items, startDate, 14);

  const width = getCardChartWidth(Dimensions.get("window").width);
  const height = width / 3;

  return (
    <Card subtitle={t("mood")} title={title}>
      <View
        style={{
          justifyContent: "flex-start",
        }}
      >
        <SleepQualityChart data={data} height={height} width={width} />
      </View>
    </Card>
  );
};
