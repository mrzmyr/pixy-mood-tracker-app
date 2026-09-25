import { MoodCounts } from "@/components/Statistics/MoodCounts";
import { TagDistribution } from "@/components/Statistics/TagDistribution";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/helpers/translation";
import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackScreenProps } from "../../../types";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
import { Header } from "./Header";
import { MoodChart } from "./MoodChart";
import { MoodPeaks } from "./MoodPeaks";
import { Navigation } from "./Navigation";
import { Stats } from "./Stats";
import { EmotionsDistribution } from "@/components/Statistics/EmotionsDistribution";
import { getItemDate } from "@/lib/logDates";

/**
 * Month report screen.
 *
 * Invalid `date` params fall back to the current month. Navigating months
 * updates the route param so deep links and back navigation stay in sync.
 */
export const StatisticsMonthScreen = ({
  navigation,
  route,
}: RootStackScreenProps<"StatisticsMonth">) => {
  const colors = useColors();
  const inset = useSafeAreaInsets();

  const [date, setDate] = useState(
    dayjs(route.params.date).isValid() ? dayjs(route.params.date) : dayjs()
  );

  const _setDate = (nextDate: dayjs.Dayjs) => {
    navigation.setParams({
      date: nextDate.format(DATE_FORMAT),
    });
    setDate(nextDate);
  };

  const prevMonth = date.subtract(1, "month");
  const nextMonth = date.add(1, "month");

  const logState = useLogState();

  const itemsInMonth = (month: dayjs.Dayjs) => {
    const prefix = month.format("YYYY-MM");
    return logState.items.filter((item) =>
      getItemDate(item).startsWith(prefix)
    );
  };
  const prevItems = itemsInMonth(prevMonth);
  const nextItems = itemsInMonth(nextMonth);
  const items = itemsInMonth(date);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <ScrollView>
        <Header
          title={date.format("MMMM YYYY")}
          subtitle={t("month_report")}
          gradientColors={[
            colors.palette.indigo[900],
            colors.palette.indigo[600],
            colors.palette.indigo[500],
          ]}
        />
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: inset.bottom + 16,
          }}
        >
          <Navigation
            nextMonth={nextMonth}
            prevMonth={prevMonth}
            onNext={() => _setDate(nextMonth)}
            onPrev={() => _setDate(prevMonth)}
            nextMonthDisabled={nextItems.length === 0}
            prevMonthDisabled={prevItems.length === 0}
          />
          <Stats items={items} prevItems={prevItems} date={date} />
          <MoodChart date={date} items={items} />
          <MoodCounts
            title={t("mood_count")}
            subtitle={t("mood_count_description", {
              date: dayjs(date).format("MMMM, YYYY"),
            })}
            items={items}
            date={date}
          />
          <TagDistribution
            title={t("statistics_most_used_tags")}
            subtitle={t("statistics_most_used_tags_description", {
              date: date.format("MMMM, YYYY"),
            })}
            items={items}
          />
          <EmotionsDistribution
            title={t("statistics_most_used_emotions")}
            subtitle={t("statistics_most_used_emotions_description", {
              date: date.format("MMMM, YYYY"),
            })}
            items={items}
          />
          <MoodPeaks items={items} date={date} />
        </View>
      </ScrollView>
    </View>
  );
};
