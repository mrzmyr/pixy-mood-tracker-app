import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { FlashListRef } from "@shopify/flash-list";
import type { Month } from "./layout";
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
import { ObserveInteractiveMarker } from "expo-observe";

const CalendarScreenComponent = () => {
  const colors = useColors();
  const { settings } = useSettings();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  const scrollRef = useRef<FlashListRef<Month>>(null);
  const showScrollTopButton = isAwayFromToday && !calendarFilters.isOpen;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      setIsAwayFromToday(
        contentSize.height - contentOffset.y - layoutMeasurement.height > 100
      );
    },
    []
  );

  if (!settings.loaded || !logState.loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CalendarHeader />
      {showScrollTopButton && (
        <ScrollToBottomButton
          onPress={() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
        />
      )}
      <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
        <Calendar
          listRef={scrollRef}
          onScroll={onScroll}
          header={
            Platform.OS === "web" && calendarFilters.isOpen ? <Body /> : null
          }
          footer={
            <>
              <View style={{ paddingBottom: 32 }}>
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
            </>
          }
        />
      </View>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
      <ObserveInteractiveMarker />
    </View>
  );
};

const CalendarScreen = memo(CalendarScreenComponent);

export default CalendarScreen;
