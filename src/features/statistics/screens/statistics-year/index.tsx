import { useLocalSearchParams } from "expo-router";
import { MoodCounts } from "../../components/mood-counts";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { getAverageMood, useLogState } from "@/features/logs";
import { useStoreReviewPrompt } from "@/features/review";
import { BestMonth } from "./best-month";
import { useReportHeader } from "../../components/use-report-header";
import { Header } from "./header";
import { MoodChart } from "./mood-chart";
import { WorstMonth } from "./worst-month";
import YearInPixels from "./year-in-pixels";
import { TagDistribution } from "../../components/tag-distribution";
import { EmotionsDistribution } from "../../components/emotions-distribution";
import { getItemDate } from "@/lib/log-dates";

/** Distance from the bottom that counts as the end of the report. */
const END_SLACK = 48;

const isAtEnd = ({
  contentOffset,
  layoutMeasurement,
  contentSize,
}: NativeScrollEvent) =>
  contentOffset.y + layoutMeasurement.height >= contentSize.height - END_SLACK;

/**
 * Year report screen. Invalid `date` params fall back to the current year.
 * Scrolling to the end, past Year in Pixels, is a store review moment.
 */
export const StatisticsYearScreen = () => {
  const { date: routeDate } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const date = useMemo(
    () => (dayjs(routeDate).isValid() ? dayjs(routeDate) : dayjs()),
    [routeDate]
  );

  const gradientColors: [string, string, string] = [
    colors.palette.orange[700],
    colors.palette.orange[500],
    colors.palette.yellow[500],
  ];
  const { bannerHeight, headerHeight, onScroll } = useReportHeader({
    title: date.format("YYYY"),
    headerColor: gradientColors[0],
  });

  const logState = useLogState();
  const year = date.format("YYYY");
  const items = logState.items.filter((item) =>
    getItemDate(item).startsWith(year)
  );

  const requestStoreReviewPrompt = useStoreReviewPrompt();
  const hasReachedEnd = useRef(false);
  const onReportScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll(event);
    if (hasReachedEnd.current || !isAtEnd(event.nativeEvent)) {
      return;
    }
    hasReachedEnd.current = true;
    requestStoreReviewPrompt({
      kind: "year_report_end",
      yearEntriesCount: items.length,
      averageRating: getAverageMood(items),
    });
  };

  return (
    <ScrollView
      onScroll={onReportScroll}
      scrollEventThrottle={16}
      style={{
        flex: 1,
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <Header
        title={date.format("YYYY")}
        subtitle={t("year_report")}
        gradientColors={gradientColors}
        bannerHeight={bannerHeight}
        headerHeight={headerHeight}
      />
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 8,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
          }}
        >
          <View
            style={{
              marginRight: 8,
              flex: 1,
            }}
          >
            <BestMonth date={date} />
          </View>
          <View
            style={{
              flex: 1,
            }}
          >
            <WorstMonth date={date} />
          </View>
        </View>
        <MoodCounts
          title={t("mood_count")}
          subtitle={t("mood_count_description", {
            date: dayjs(date).format("YYYY"),
          })}
          date={date}
          items={items}
        />
        <MoodChart date={date} />
        <YearInPixels date={date} items={items} />
        <EmotionsDistribution
          title={t("statistics_most_used_emotions")}
          subtitle={t("statistics_most_used_emotions_description", {
            date: date.format("YYYY"),
          })}
          items={items}
        />
        <TagDistribution
          title={t("statistics_most_used_tags")}
          subtitle={t("statistics_most_used_tags_description", {
            date: date.format("YYYY"),
          })}
          items={items}
        />
      </View>
    </ScrollView>
  );
};
