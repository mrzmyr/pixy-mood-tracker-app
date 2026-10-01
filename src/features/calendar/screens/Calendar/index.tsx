import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { FlashListRef } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-screens/experimental";
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
import { t } from "@/lib/translation";
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
      {/*
       * Clip the list at the top. The native SafeAreaView includes the tab
       * bar (JS insets do not), so the list frame ends above the bar. The
       * list draws past its frame, under the bar.
       */}
      <View
        style={{
          flex: 1,
          overflow: "hidden",
          backgroundColor: colors.calendarBackground,
        }}
      >
        <SafeAreaView edges={{ bottom: true }} style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Calendar
              listRef={scrollRef}
              onScroll={onScroll}
              header={
                Platform.OS === "web" && calendarFilters.isOpen ? (
                  <Body />
                ) : null
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
            {showScrollTopButton && (
              <ScrollToBottomButton
                onPress={() => {
                  analytics.track("calendar:today_tapped");
                  scrollRef.current?.scrollToEnd({ animated: true });
                }}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
      {Platform.OS !== "web" && <CalendarBottomSheet />}
      <ObserveInteractiveMarker />
    </View>
  );
};

const CalendarScreen = memo(CalendarScreenComponent);

export default CalendarScreen;
