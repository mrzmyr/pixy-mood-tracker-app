import React, { memo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, useWindowDimensions, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useCalendarFilters } from "@/hooks/useCalendarFilters";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/hooks/useLogs";
import { useSettings } from "@/hooks/useSettings";
import Calendar from "./Calendar";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import { CalendarFooter } from "./CalendarFooter";
import CalendarHeader from "./CalendarHeader";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { t } from "@/helpers/translation";

const CalendarScreen = memo(function CalendarScreen() {
  const initialMonthCount = 13;
  const monthsPerPage = 12;
  const colors = useColors();

  const { settings } = useSettings();
  const logState = useLogState()
  const calendarFilters = useCalendarFilters();
  const window = useWindowDimensions();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [monthCount, setMonthCount] = useState(initialMonthCount);
  const [calendarHeight, setCalendarHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const isLoadingEarlierMonths = useRef(false);
  const requestedFromMonthCount = useRef(0);
  const previousContentHeight = useRef(0);
  const isInitialPositionSet = useRef(false);

  const showScrollTopButton = (
    scrollOffset < calendarHeight - window.height &&
    !calendarFilters.isOpen
  )

  const loadEarlierMonths = () => {
    setMonthCount((count) => count + monthsPerPage);
  };

  const updateScrollOffset = (offset: number) => {
    setScrollOffset(offset);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;
    updateScrollOffset(offset);

    if (
      isInitialPositionSet.current &&
      offset < 100 &&
      !isLoadingEarlierMonths.current
    ) {
      isLoadingEarlierMonths.current = true;
      requestedFromMonthCount.current = monthCount;
      loadEarlierMonths();
    }
  };

  const onContentSizeChange = (_width: number, height: number) => {
    if (!isInitialPositionSet.current) {
      scrollRef.current?.scrollToEnd({ animated: false });
      isInitialPositionSet.current = true;
    }

    if (height > previousContentHeight.current) {
      if (
        isLoadingEarlierMonths.current &&
        monthCount > requestedFromMonthCount.current
      ) {
        isLoadingEarlierMonths.current = false;
      }
      previousContentHeight.current = height;
    }
  };

  if (!settings.loaded || !logState.loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    )
  }

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <CalendarHeader />
      {showScrollTopButton && (
        <ScrollToBottomButton
          onPress={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollToEnd({ animated: true });
            }
          }}
        />
      )}
      <ScrollView
        style={{
          backgroundColor: colors.calendarBackground,
          paddingLeft: 16,
          paddingRight: 16,
          width: "100%",
        }}
        scrollEventThrottle={100}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        ref={scrollRef}
      >
        {Platform.OS === "web" && calendarFilters.isOpen && <Body />}
        <Calendar monthCount={monthCount} onCalendarHeightChange={setCalendarHeight} />
        <View style={{ paddingBottom: 32 }}>
          <CalendarFooter />
        </View>

        <View
          style={{
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 20,
              textAlign: 'center',
              marginBottom: -60,
            }}
          >🙏 {t('calendar_foot_note')}</Text>
        </View>
      </ScrollView>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
    </View>
  );
});

export default CalendarScreen;
