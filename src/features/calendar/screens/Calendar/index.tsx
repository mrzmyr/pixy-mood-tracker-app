import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { FlashListRef } from "@shopify/flash-list";
import type { Month } from "./layout";
import { useCalendarFilters } from "../../filters";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import { useSetting } from "@/state/settings";
import { useAnalytics } from "@/state/analytics";
import Calendar from "./Calendar";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import { CalendarFooter } from "./CalendarFooter";
import CalendarHeader from "./CalendarHeader";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useFootNote } from "./footNote";
import { ObserveInteractiveMarker } from "expo-observe";

const CalendarScreenComponent = () => {
  /*
   * Opt out of React Compiler. Compiled, this screen returns a cached footer
   * element while its tab is frozen (freezeOnBlur). After unfreezing, FlashList
   * kept the stale footer: resetting data in Settings left "Add another entry
   * for today" on an empty calendar (e2e/flows/data-round-trip.yaml).
   */
  "use no memo";
  const colors = useColors();
  const isSettingsLoaded = useSetting("loaded");
  const analytics = useAnalytics();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const { text: footNote, onOverscroll: onFootNoteOverscroll } = useFootNote();
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  const scrollRef = useRef<FlashListRef<Month>>(null);
  const showScrollTopButton = isAwayFromToday && !calendarFilters.isOpen;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceToEnd =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      setIsAwayFromToday(distanceToEnd > 100);
      onFootNoteOverscroll(-distanceToEnd);
    },
    [onFootNoteOverscroll]
  );

  if (!isSettingsLoaded || !logState.loaded) {
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
            analytics.track("calendar:today_tapped");
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
                  {footNote}
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
