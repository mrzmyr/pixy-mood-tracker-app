import React, { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, useWindowDimensions, View } from "react-native";
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
  const colors = useColors();

  const { settings } = useSettings();
  const logState = useLogState()
  const calendarFilters = useCalendarFilters();
  const window = useWindowDimensions();
  const [scrollOffset, setScrollOffset] = useState(0);

  const calendarRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const calendarHeight = useRef(0);


  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollToEnd({ animated: false });
        }
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

  const showScrollTopButton = (
    scrollOffset < calendarHeight.current - window.height &&
    !calendarFilters.isOpen
  )

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
        onMomentumScrollEnd={(e) => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        ref={scrollRef}
      >
        <View
          style={{
            paddingBottom: 32,
          }}
        >
          {Platform.OS === "web" && calendarFilters.isOpen && <Body />}
          <Calendar ref={calendarRef} />
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
