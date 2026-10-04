import { FlashList } from "@shopify/flash-list";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import dayjs from "dayjs";
import { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useWeekLocale } from "@/hooks/useWeekLocale";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";
import { useSetting } from "@/state/settings";
import { useFilteredItemIds, useItemsByDate } from "./itemsByDate";
import { getMonthGrid, getYears } from "./layout";

const positionConfig = { startRenderingFromBottom: true };
const contentStyle = { paddingHorizontal: 16, paddingBottom: 32 };
const getKey = (year: string) => year;

const styles = StyleSheet.create({
  yearTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  monthRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  month: {
    flex: 1,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  week: {
    flexDirection: "row",
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    margin: 0.5,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 8,
    fontVariant: ["tabular-nums"],
  },
});

interface MonthProps {
  month: string;
  locale: string;
  today: string;
  itemsByDate: Record<string, LogItem[]>;
  filteredIds: Set<string>;
  isFiltering: boolean;
  onPress: (month: string) => void;
}

/** One month as a grid of mood pixels. The whole month is one button. */
const YearMonthComponent = ({
  month,
  locale,
  today,
  itemsByDate,
  filteredIds,
  isFiltering,
  onPress,
}: MonthProps) => {
  const colors = useColors();
  const haptics = useHaptics();
  const scaleType = useSetting("scaleType");
  const date = dayjs(month);
  const isFuture = month > today;
  const isCurrentMonth = date.isSame(today, "month");
  const grid = useMemo(() => getMonthGrid({ month, locale }), [month, locale]);

  const getDayStyle = (day: string) => {
    const items = itemsByDate[day] ?? [];
    const isShown =
      items.length > 0 &&
      (!isFiltering || items.some((item) => filteredIds.has(item.id)));
    const rating = isShown ? getAverageMood(items) : null;
    const scale = colors.scales[scaleType];
    const isToday = day === today;
    return {
      backgroundColor: rating ? scale[rating].background : "transparent",
      borderWidth: isToday ? 1.5 : 0,
      borderColor: colors.tint,
      color: rating ? scale[rating].textSecondary : colors.text,
      opacity: day > today ? 0.3 : 1,
    };
  };

  return (
    <Pressable
      testID={`calendar-year-month-${date.format("YYYY-MM")}`}
      accessibilityRole="button"
      accessibilityLabel={date.format("MMMM YYYY")}
      disabled={isFuture}
      onPress={() => {
        haptics.selection();
        onPress(month);
      }}
      style={({ pressed }) => [styles.month, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text
        style={[
          styles.monthTitle,
          { color: isCurrentMonth ? colors.tint : colors.text },
          isFuture && { opacity: 0.3 },
        ]}
      >
        {date.format("MMM")}
      </Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {grid.map((week, row) => (
          <View key={`${month}-${row}`} style={styles.week}>
            {week.map((day, column) => {
              if (day === null) {
                return <View key={`${row}-${column}`} style={styles.day} />;
              }
              const { color, opacity, ...dayStyle } = getDayStyle(day);
              return (
                <View key={day} style={[styles.day, dayStyle, { opacity }]}>
                  <Text style={[styles.dayText, { color }]}>
                    {dayjs(day).date()}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Pressable>
  );
};
const YearMonth = memo(YearMonthComponent);

const MONTH_ROWS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
];

const YearComponent = ({
  year,
  ...monthProps
}: Omit<MonthProps, "month"> & { year: string }) => {
  const colors = useColors();
  const isCurrentYear = year === monthProps.today.slice(0, 4);
  return (
    <View testID={`calendar-year-${year}`}>
      <Text
        accessibilityRole="header"
        style={[
          styles.yearTitle,
          { color: isCurrentYear ? colors.tint : colors.text },
        ]}
      >
        {year}
      </Text>
      {MONTH_ROWS.map((row) => (
        <View key={row[0]} style={styles.monthRow}>
          {row.map((index) => {
            const month = dayjs(`${year}-01-01`)
              .add(index, "month")
              .format(DATE_FORMAT);
            return <YearMonth key={month} month={month} {...monthProps} />;
          })}
        </View>
      ))}
    </View>
  );
};
const Year = memo(YearComponent);

const YearViewComponent = ({
  onOpenMonth,
  header,
}: {
  onOpenMonth: (month: string) => void;
  header: React.ReactElement | null;
}) => {
  const logState = useLogState();
  const locale = useWeekLocale();
  const itemsByDate = useItemsByDate();
  const { ids: filteredIds, isFiltering } = useFilteredItemIds();
  const today = dayjs().format(DATE_FORMAT);
  const currentYear = Number(today.slice(0, 4));
  const firstYear = useMemo(() => {
    let first = currentYear;
    for (const item of logState.items) {
      first = Math.min(first, Number(getItemDate(item).slice(0, 4)));
    }
    return first;
  }, [logState.items, currentYear]);
  const years = useMemo(
    () => getYears({ first: firstYear, last: currentYear }),
    [firstYear, currentYear]
  );

  const renderYear = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <Year
        year={item}
        locale={locale}
        today={today}
        itemsByDate={itemsByDate}
        filteredIds={filteredIds}
        isFiltering={isFiltering}
        onPress={onOpenMonth}
      />
    ),
    [locale, today, itemsByDate, filteredIds, isFiltering, onOpenMonth]
  );

  return (
    <FlashList
      testID="calendar-year-list"
      data={years}
      renderItem={renderYear}
      keyExtractor={getKey}
      contentContainerStyle={contentStyle}
      maintainVisibleContentPosition={positionConfig}
      ListHeaderComponent={header}
    />
  );
};

/**
 * Year view: every year since the first entry, newest at the bottom. Days
 * show the average mood color. Tapping a month opens it in the month view.
 */
export const YearView = memo(YearViewComponent);
