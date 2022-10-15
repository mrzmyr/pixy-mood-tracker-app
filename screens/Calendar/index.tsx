import React, { memo, useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Calendar from "./Calendar";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import CalendarHeader from "./CalendarHeader";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

const CalendarScreen = memo(function CalendarScreen() {
  const colors = useColors();

  const calendarFilters = useCalendarFilters();
  const window = useWindowDimensions();
  const [scrollOffset, setScrollOffset] = useState(0);

  const calendarRef = useRef(null);
  const scrollRef = useRef(null);
  const calendarHeight = useRef(0);

  useEffect(() => {
    if (calendarRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollToEnd({ animated: false });
      }, 0)
    }
  }, [calendarRef]);

  useEffect(() => {
    if (calendarRef.current) {
      setTimeout(() => {
        calendarRef.current.measure((x, y, width, height) => {
          calendarHeight.current = height;
        });
      }, 0)
    }
  }, [calendarRef]);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <CalendarHeader />
      {scrollOffset < calendarHeight.current - window.height &&
        !calendarFilters.isOpen && (
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
    </View>
  );
});

export default CalendarScreen;
