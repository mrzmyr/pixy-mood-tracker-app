import React, { memo, useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { FlashListRef } from "@shopify/flash-list";
import { HeaderHeightContext } from "expo-router/react-navigation";
import type { Month } from "./layout";
import { useCalendarFilters } from "../../filters";
import { HAS_FLOATING_HEADER } from "../../floatingHeader";
import useColors from "@/hooks/useColors";
import { ForYouToday } from "@/features/interventions";
import { useLogLoad, useLogState } from "@/features/logs";
import { useSettingsLoad } from "@/state/settings";
import { useAnalytics } from "@/state/analytics";
import Calendar from "./Calendar";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import { PromoCards } from "./PromoCards";
import CalendarHeader from "./CalendarHeader";
import { CalendarFloatButton } from "./CalendarFloatButton";
import { useFootNote } from "./footNote";
import { ObserveInteractiveMarker } from "expo-observe";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate } from "@/lib/logDates";

// Space between the list end and the foot note, revealed on overscroll.
const FOOT_NOTE_GAP = 20;

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isSettingsLoaded = useSettingsLoad().status === "ready";
  const isLogsLoaded = useLogLoad().status === "ready";
  const analytics = useAnalytics();
  const logState = useLogState();
  const calendarFilters = useCalendarFilters();
  const { text: footNote, onOverscroll: onFootNoteOverscroll } = useFootNote();
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  // Footer (news card, foot note) sits below today, so the chevron waits
  // for one screen plus the footer.
  const footerHeight = useRef(0);
  const scrollRef = useRef<FlashListRef<Month>>(null);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [weekdayHeight, setWeekdayHeight] = useState(0);
  // A floating header overlaps the list, so the list starts below it.
  const topInset = HAS_FLOATING_HEADER ? headerHeight + weekdayHeight : 0;
  const showFloatButton = !calendarFilters.isOpen;
  const today = dayjs().format(DATE_FORMAT);
  const hasTodayEntry = logState.items.some(
    (item) => getItemDate(item) === today
  );
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceToEnd =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      setIsAwayFromToday(
        distanceToEnd > layoutMeasurement.height + footerHeight.current
      );
      onFootNoteOverscroll(-distanceToEnd);
    },
    [onFootNoteOverscroll]
  );

  if (!isSettingsLoaded || !isLogsLoaded) {
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
          <View
            onLayout={(event) => {
              footerHeight.current = event.nativeEvent.layout.height;
            }}
          >
            <ForYouToday />
            <View style={{ paddingBottom: 32 }}>
              <PromoCards />
            </View>
            {/* Zero height: the note sits below the list end, under the
                bottom safe area padding, and shows only on overscroll. */}
            <View style={{ height: 0 }}>
              <Text
                style={{
                  position: "absolute",
                  top: insets.bottom + FOOT_NOTE_GAP,
                  left: 0,
                  right: 0,
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {footNote}
              </Text>
            </View>
          </View>
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
      {showFloatButton && (
        <CalendarFloatButton
          isAtBottom={!isAwayFromToday}
          hasTodayEntry={hasTodayEntry}
          onScrollToBottom={() => {
            analytics.track("calendar:today_tapped");
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
          onAdd={() => {
            analytics.track("calendar:add_today_tapped", {
              has_entries: hasTodayEntry,
            });
            router.push({
              pathname: "/logs/create/[dateTime]",
              params: { dateTime: dayjs().toISOString() },
            });
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
