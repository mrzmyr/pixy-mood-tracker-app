import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { FlashListRef } from "@shopify/flash-list";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { getGeometry } from "./layout";
import type { Month } from "./layout";
import { useCalendarFiltersSheet } from "../../filters";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";
import { useCalendarLayout } from "../../calendar-layout";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { useToday } from "@/hooks/use-today";
import { ForYouToday } from "@/features/interventions";
import { CalendarStoryCard } from "@/features/recaps";
import { useLogLoad, useLogState } from "@/features/logs";
import { useSettingsLoad } from "@/state/settings";
import { useAnalytics } from "@/state/analytics";
import Calendar from "./calendar";
import { CalendarBottomSheet } from "./calendar-bottom-sheet";
import { Body } from "./calendar-bottom-sheet/body";
import { PromoCards } from "./promo-cards";
import CalendarHeader from "./calendar-header";
import { CalendarFloatButton } from "./calendar-float-button";
import { CalendarSecondaryButtons } from "./calendar-secondary-button";
import { useFootNote } from "./foot-note";
import { Timeline } from "./timeline";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { getItemDate } from "@/lib/log-dates";
import {
  getChromeIntroStyle,
  playCalendarIntro,
  useCalendarIntro,
} from "../../intro";

// Space between the list end and the foot note, revealed on overscroll.
const FOOT_NOTE_GAP = 20;

const CalendarScreenComponent = () => {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  // One empty calendar row at the list end keeps the float buttons off the
  // last week. The list spans the window, so its rows match this height.
  const { weekHeight } = getGeometry({
    width,
    fontScale,
    isAndroid: Platform.OS === "android",
  });
  const isSettingsLoaded = useSettingsLoad().status === "ready";
  const isLogsLoaded = useLogLoad().status === "ready";
  const analytics = useAnalytics();
  const logState = useLogState();
  const filtersSheet = useCalendarFiltersSheet();
  const { layout } = useCalendarLayout();
  const intro = useCalendarIntro();
  const introStyle = getChromeIntroStyle(intro);
  // Timeline: no weekday row, no scroll to today.
  const isCalendar = layout === "calendar";
  const { text: footNote, onOverscroll: onFootNoteOverscroll } = useFootNote();
  const [isAwayFromToday, setIsAwayFromToday] = useState(false);
  // Footer (news card, foot note) sits below today, so the chevron waits
  // for one screen plus the footer.
  const footerHeight = useRef(0);
  const scrollRef = useRef<FlashListRef<Month>>(null);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [weekdayHeight, setWeekdayHeight] = useState(0);
  // A floating header overlaps the list, so the list starts below it. The
  // timeline has no weekday row.
  const topInset = HAS_FLOATING_HEADER
    ? headerHeight + (isCalendar ? weekdayHeight : 0)
    : 0;
  const showFloatButton = !filtersSheet.isOpen;
  const today = useToday();
  // The timeline has no pixels: its intro only fades in the chrome. The
  // calendar starts its intro once the list knows the top row.
  useEffect(() => {
    if (!isCalendar) {
      playCalendarIntro({ origin: today, lastDate: today });
    }
  }, [isCalendar, today]);
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

  const filtersBody =
    Platform.OS === "web" && filtersSheet.isOpen ? <Body /> : null;

  const calendarList = isCalendar ? (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      <Calendar
        listRef={scrollRef}
        onScroll={onScroll}
        topInset={topInset}
        header={filtersBody}
        footer={
          <Animated.View
            style={introStyle}
            onLayout={(event) => {
              footerHeight.current = event.nativeEvent.layout.height;
            }}
          >
            <CalendarStoryCard />
            <ForYouToday />
            <View style={{ paddingBottom: 32 }}>
              <PromoCards />
            </View>
            <View style={{ height: weekHeight }} />
            {/* Zero height: the note sits below the list end, under the
                bottom safe area padding, and shows only on overscroll. */}
            <View style={{ height: 0 }}>
              <Copy
                size={14}
                style={{
                  position: "absolute",
                  top: insets.bottom + FOOT_NOTE_GAP,
                  left: 0,
                  right: 0,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {footNote}
              </Copy>
            </View>
          </Animated.View>
        }
      />
    </View>
  ) : (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      <Timeline header={filtersBody} topInset={topInset} />
    </View>
  );

  let content = calendarList;
  if (isCalendar) {
    content = HAS_FLOATING_HEADER ? (
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
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      {content}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, introStyle]}
      >
        {showFloatButton && (
          <CalendarFloatButton
            // Newest entries sit at the timeline top: it always shows add.
            isAtBottom={!isCalendar || !isAwayFromToday}
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
        {showFloatButton && (!isCalendar || !isAwayFromToday) && (
          <CalendarSecondaryButtons hasTodayEntry={hasTodayEntry} />
        )}
      </Animated.View>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
    </View>
  );
};

const CalendarScreen = memo(CalendarScreenComponent);

export default CalendarScreen;
