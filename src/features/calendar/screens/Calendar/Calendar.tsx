import { useWeekLocale } from "@/hooks/useWeekLocale";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef, ListRenderItemInfo } from "@shopify/flash-list";

import dayjs from "dayjs";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import { DATE_FORMAT } from "@/constants/Config";
import CalendarMonth from "./CalendarMonth";
import { getGeometry, getMonths } from "./layout";
import type { Month } from "./layout";

import { useItemsByDate } from "./itemsByDate";

const positionConfig = { startRenderingFromBottom: true };
const getKey = (item: Month) => item.date;
const getType = (item: Month) => item.weeks;
const contentStyle = { paddingHorizontal: 16 };

const CalendarComponent = ({
  listRef,
  header,
  footer,
  onScroll,
  initialMonth = null,
}: {
  /** Any day of the month to open at. `null` opens at the current month. */
  initialMonth?: string | null;
  listRef: React.RefObject<FlashListRef<Month> | null>;
  header: React.ReactElement | null;
  footer: React.ReactElement;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) => {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const currentMonth = dayjs().startOf("month").format(DATE_FORMAT);
  // Months back from the current month to `initialMonth`. FlashList reads
  // `initialScrollIndex` once; the screen remounts this list per month.
  const initialOffset = useMemo(
    () =>
      initialMonth === null
        ? 0
        : Math.max(
            dayjs(currentMonth).diff(
              dayjs(initialMonth).startOf("month"),
              "month"
            ),
            0
          ),
    [currentMonth, initialMonth]
  );
  const [monthCount, setMonthCount] = useState(() =>
    Math.max(13, initialOffset + 1)
  );
  const isLoaded = useRef(false);
  const locale = useWeekLocale();
  const months = useMemo(
    () => getMonths({ end: currentMonth, count: monthCount, locale }),
    [currentMonth, monthCount, locale]
  );
  const geometry = useMemo(
    () =>
      getGeometry({ width, fontScale, isAndroid: Platform.OS === "android" }),
    [width, fontScale]
  );
  const itemMap = useItemsByDate();
  const renderMonth = useCallback(
    ({ item }: ListRenderItemInfo<Month>) => (
      <CalendarMonth
        dateString={item.date}
        itemMap={itemMap}
        weeks={item.weeks}
        geometry={geometry}
      />
    ),
    [itemMap, geometry]
  );
  const loadEarlierMonths = useCallback(() => {
    // onStartReached can run while FlashList is still positioning its initial viewport.
    // https://shopify.github.io/flash-list/docs/usage/#onload
    if (isLoaded.current) {
      setMonthCount((count) => count + 12);
    }
  }, []);
  const onLoad = useCallback(() => {
    isLoaded.current = true;
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {width > 0 && (
        <FlashList
          ref={listRef}
          testID="calendar-list"
          data={months}
          renderItem={renderMonth}
          keyExtractor={getKey}
          getItemType={getType}
          contentContainerStyle={contentStyle}
          maintainVisibleContentPosition={positionConfig}
          onStartReached={loadEarlierMonths}
          onStartReachedThreshold={1}
          initialScrollIndex={
            initialOffset > 0 ? monthCount - 1 - initialOffset : undefined
          }
          onLoad={onLoad}
          onScroll={onScroll}
          scrollEventThrottle={32}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
        />
      )}
    </View>
  );
};
const Calendar = memo(CalendarComponent);
Calendar.displayName = "Calendar";
export default Calendar;
