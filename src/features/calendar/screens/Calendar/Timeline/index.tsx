import { FlashList } from "@shopify/flash-list";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import dayjs from "dayjs";
import React, { memo, useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import { getItemDate } from "@/lib/logDates";
import { t } from "@/lib/translation";
import { useCalendarFilters } from "../../../filters";
import { useCalendarNavigation } from "../../../navigation";
import { getTimelineRows } from "./rows";
import type { TimelineRow } from "./rows";
import { TimelineEntry } from "./TimelineEntry";

// Room for the float button below the last card.
const FLOAT_BUTTON_SPACE = 96;

const getKey = (row: TimelineRow) => row.key;
const getType = (row: TimelineRow) => row.type;

const MonthTitle = ({ month }: { month: string }) => {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: 28,
        fontWeight: "bold",
        color: colors.text,
        marginTop: 16,
        marginBottom: 12,
      }}
    >
      {dayjs(`${month}-01`).format("MMMM YYYY")}
    </Text>
  );
};

const TimelineComponent = ({
  header,
  topInset = 0,
}: {
  header: React.ReactElement | null;
  /** Space under a floating header; content and scroll bar start below it. */
  topInset?: number;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const { openDay } = useCalendarNavigation();
  const { isFiltering, filteredItems } = calendarFilters.data;
  const items = isFiltering ? filteredItems : logState.items;
  const rows = useMemo(() => getTimelineRows(items), [items]);
  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingTop: topInset,
      paddingBottom: insets.bottom + FLOAT_BUTTON_SPACE,
    }),
    [topInset, insets.bottom]
  );
  const indicatorInsets = useMemo(() => ({ top: topInset }), [topInset]);
  const openEntry = useCallback(
    (item: LogItem) => openDay({ date: getItemDate(item), source: "timeline" }),
    [openDay]
  );
  const renderRow = useCallback(
    ({ item: row }: ListRenderItemInfo<TimelineRow>) =>
      row.type === "month" ? (
        <MonthTitle month={row.month} />
      ) : (
        <TimelineEntry item={row.item} onPress={openEntry} />
      ),
    [openEntry]
  );

  return (
    <FlashList
      testID="timeline-list"
      data={rows}
      renderItem={renderRow}
      keyExtractor={getKey}
      getItemType={getType}
      contentContainerStyle={contentStyle}
      scrollIndicatorInsets={indicatorInsets}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={{ paddingVertical: 48, alignItems: "center" }}>
          <Text style={{ fontSize: 17, color: colors.textSecondary }}>
            {t("calendar_timeline_empty")}
          </Text>
        </View>
      }
    />
  );
};

/**
 * Timeline layout of the calendar screen, like Apple Journal: entry cards,
 * newest first, grouped by month. Active calendar filters apply. A card
 * opens its day.
 */
export const Timeline = memo(TimelineComponent);
