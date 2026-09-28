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
import { useLogState } from "@/features/logs";
import CalendarMonth from "./CalendarMonth";
import { getGeometry, getMonths } from "./layout";
import type { Month } from "./layout";
import { getItemDate } from "@/lib/logDates";

const positionConfig = { startRenderingFromBottom: true };
const getKey = (item: Month) => item.date;
const getType = (item: Month) => item.weeks;
const contentStyle = { paddingHorizontal: 16 };

const CalendarComponent = ({
  listRef,
  header,
  footer,
  onScroll,
}: {
  listRef: React.RefObject<FlashListRef<Month> | null>;
  header: React.ReactElement | null;
  footer: React.ReactElement;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) => {
  const logState = useLogState();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [monthCount, setMonthCount] = useState(13);
  const isLoaded = useRef(false);
  const currentMonth = dayjs().startOf("month").format(DATE_FORMAT);
  const locale = dayjs.locale();
  const months = useMemo(
    () => getMonths({ end: currentMonth, count: monthCount, locale }),
    [currentMonth, monthCount, locale]
  );
  const geometry = useMemo(
    () =>
      getGeometry({ width, fontScale, isAndroid: Platform.OS === "android" }),
    [width, fontScale]
  );
  const itemMap = useMemo(() => {
    const itemsByDate: Record<string, typeof logState.items> = {};
    for (const item of logState.items) {
      const date = getItemDate(item);
      if (!itemsByDate[date]) {
        itemsByDate[date] = [];
      }
      itemsByDate[date].push(item);
    }
    return itemsByDate;
  }, [logState.items]);
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
