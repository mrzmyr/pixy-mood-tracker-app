import dayjs from "dayjs";
import React, { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
import { useSettings } from "../../hooks/useSettings";
import Calendar from "./Calendar";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import CalendarHeader from "./CalendarHeader";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { TodayEntryButton } from "./TodayEntryButton";

const CalendarScreen = memo(function CalendarScreen() {
  const colors = useColors();

  const { settings } = useSettings();
  const logState = useLogState()
  const calendarFilters = useCalendarFilters();
  const window = useWindowDimensions();
  const [scrollOffset, setScrollOffset] = useState(0);

  const calendarRef = useRef(null);
  const scrollRef = useRef(null);
  const calendarHeight = useRef(0);


  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollToEnd({ animated: false });
      }, 0)
    }
  }, [calendarRef, scrollRef, settings.loaded, logState.loaded]);

  useEffect(() => {
    if (calendarRef.current) {
      setTimeout(() => {
        if (calendarRef.current) {
          calendarRef.current.measure((x, y, width, height) => {
            calendarHeight.current = height;
          });
        }
      }, 0)
    }
  }, [calendarRef, scrollRef, settings.loaded, logState.loaded]);

  if (!settings.loaded || !logState.loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    )
  }

  const showScrollTopButton = (
    scrollOffset < calendarHeight.current - window.height &&
    !calendarFilters.isOpen
  )

  const hasTodayItem = logState.items.find(item => {
    return dayjs(item.dateTime).isSame(dayjs(), 'day')
  })

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
            scrollRef.current.scrollToEnd({ animated: true });
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
        onMomentumScrollEnd={(e) => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        ref={scrollRef}
      >
        {Platform.OS === "web" && calendarFilters.isOpen && <Body />}
        <Calendar ref={calendarRef} />
      </ScrollView>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
      <TodayEntryButton
        isVisibile={!showScrollTopButton && !hasTodayItem && !calendarFilters.isOpen}
      />
    </View>
  );
});

export default CalendarScreen;
