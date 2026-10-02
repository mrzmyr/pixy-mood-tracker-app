import React, { memo, useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { FlashListRef } from "@shopify/flash-list";
import { HeaderHeightContext } from "expo-router/react-navigation";
import type { Month } from "./layout";
import { useCalendarFilters } from "../../filters";
import { HAS_FLOATING_HEADER } from "../../floatingHeader";
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
import { t } from "@/lib/translation";
import { ObserveInteractiveMarker } from "expo-observe";

const CalendarScreenComponent = () => {
  /*
   * Opt out of React Compiler. Compiled, this screen returns a cached footer
   * element while its screen is frozen (freezeOnBlur, set on tabs until the
   * tab bar was removed). After unfreezing, FlashList
   * kept the stale footer: resetting data in Settings left "Add another entry
   * for today" on an empty calendar (e2e/flows/data-round-trip.yaml).
   */
  "use no memo";
  const colors = useColors();
  const isSettingsLoaded = useSetting("loaded");
  const analytics = useAnalytics();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  const scrollRef = useRef<FlashListRef<Month>>(null);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [weekdayHeight, setWeekdayHeight] = useState(0);
  // A floating header overlaps the list, so the list starts below it.
  const topInset = HAS_FLOATING_HEADER ? headerHeight + weekdayHeight : 0;
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

  if (!isSettingsLoaded || !logState.loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  const calendarList = (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      <Calendar
        listRef={scrollRef}
        onScroll={onScroll}
        topInset={topInset}
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
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      {HAS_FLOATING_HEADER ? (
        <>
          {/* List first: iOS applies the scroll edge effect only to a scroll
              view in the first-child chain of the screen. */}
          {calendarList}
          <CalendarHeader
            floatingTop={headerHeight}
            onHeightChange={setWeekdayHeight}
          />
        </>
      ) : (
        <>
          <CalendarHeader />
          {calendarList}
        </>
      )}
      {showScrollTopButton && (
        <ScrollToBottomButton
          onPress={() => {
            analytics.track("calendar:today_tapped");
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
        />
      )}
      {Platform.OS !== "web" && <CalendarBottomSheet />}
      <ObserveInteractiveMarker />
    </View>
  );
};

const CalendarScreen = memo(CalendarScreenComponent);

export default CalendarScreen;
