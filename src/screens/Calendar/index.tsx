import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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

const CalendarScreenComponent = () => {
  const colors = useColors();

  const { settings } = useSettings();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const window = useWindowDimensions();
  // Whether the user scrolled above the calendar's bottom edge. Updated on
  // scroll end only, like the previous offset state, so the button does not
  // appear before the user scrolls.
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const calendarRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const calendarHeight = useRef(0);

  // The calendar only renders after settings and logs are loaded.
  useEffect(() => {
    if (!settings.loaded || !logState.loaded || !scrollRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: false });
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [settings.loaded, logState.loaded]);

  useEffect(() => {
    if (!settings.loaded || !logState.loaded || !calendarRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      if (calendarRef.current) {
        calendarRef.current.measure((x, y, width, height) => {
          calendarHeight.current = height;
        });
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [settings.loaded, logState.loaded]);

  const onScrollEnd = (offsetY: number) => {
    setIsScrolledUp(offsetY < calendarHeight.current - window.height);
  };

  const showScrollTopButton = isScrolledUp && !calendarFilters.isOpen;

  if (!settings.loaded || !logState.loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
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
          onScrollEnd(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          onScrollEnd(e.nativeEvent.contentOffset.y);
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

        <View style={{}}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 20,
              textAlign: "center",
              marginBottom: -60,
            }}
          >
            🙏 {t("calendar_foot_note")}
          </Text>
        </View>
      </ScrollView>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
    </View>
  );
};

const CalendarScreen = memo(CalendarScreenComponent);

export default CalendarScreen;
