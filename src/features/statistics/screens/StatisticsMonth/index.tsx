import { useLocalSearchParams, useRouter } from "expo-router";
import { MoodCounts } from "../../components/MoodCounts";
import { TagDistribution } from "../../components/TagDistribution";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { useEffect, useEffectEvent, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import { Header } from "./Header";
import { MoodChart } from "./MoodChart";
import { MoodPeaks } from "./MoodPeaks";
import { Navigation } from "./Navigation";
import { Stats } from "./Stats";
import { EmotionsDistribution } from "../../components/EmotionsDistribution";
import { getItemDate } from "@/lib/logDates";
import { useAnalytics } from "@/state/analytics";
import { useScreenEngagement } from "../../useScreenEngagement";

/**
 * Month report screen.
 *
 * Invalid `date` params fall back to the current month. Navigating months
 * updates the route param so deep links and back navigation stay in sync.
 */
export const StatisticsMonthScreen = () => {
  const router = useRouter();
  const { date: routeDate } = useLocalSearchParams<{ date: string }>();
  const colors = useColors();
  const inset = useSafeAreaInsets();

  const [date, setDate] = useState(
    dayjs(routeDate).isValid() ? dayjs(routeDate) : dayjs()
  );

  const _setDate = (nextDate: dayjs.Dayjs) => {
    router.setParams({
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

  const analytics = useAnalytics();
  const { onScroll } = useScreenEngagement("month", true);
  // Effect event: reads the latest entries without re-running on log changes.
  const trackReportViewed = useEffectEvent((month: dayjs.Dayjs) => {
    analytics.track("statistics:report_viewed", {
      kind: "month",
      periods_ago: dayjs()
        .startOf("month")
        .diff(month.startOf("month"), "month"),
      entries_count: itemsInMonth(month).length,
    });
  });
  useEffect(() => {
    trackReportViewed(date);
  }, [date]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <ScrollView onScroll={onScroll} scrollEventThrottle={100}>
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
