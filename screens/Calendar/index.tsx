import { Motion } from "@legendapp/motion";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { PlusCircle } from "react-native-feather";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { t } from "../../helpers/translation";
import { useCalendarFilters } from "../../hooks/useCalendarFilters";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
import { useSettings } from "../../hooks/useSettings";
import Calendar from "./Calendar";
import { CalendarBottomSheet } from "./CalendarBottomSheet";
import { Body } from "./CalendarBottomSheet/Body";
import CalendarHeader from "./CalendarHeader";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

const TodayEntryButton = memo(({
  isVisibile,
}: {
  isVisibile: boolean;
}) => {
  const insets = useSafeAreaInsets()
  const colors = useColors();
  const navigation = useNavigation();

  return (
    <Motion.View
      style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        paddingHorizontal: 12,
        alignItems: "center",
        zIndex: 100,
      }}
      initial={{
        bottom: -100,
      }}
      animate={{
        bottom: isVisibile ? 0 : -100,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300
      }}
    >
      {/* Backdrop */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackgroundTransparent, colors.calendarBackground]}
        style={{
          position: 'absolute',
          height: 120 + insets.bottom,
          bottom: 0,
          zIndex: 1,
          width: '100%',
        }}
      />
      <View
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          marginBottom: 32,
        }}
      >
        <Button
          icon={<PlusCircle width={24} height={24} color={colors.primaryButtonText} />}
          onPress={() => {
            navigation.navigate("LogCreate", {
              date: dayjs().format("YYYY-MM-DD"),
            });
          }}
        >{t('add_today_entry')}</Button>
      </View>
    </Motion.View>
  );
});

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

  const hasTodayItem = Object.values(logState.items).find(item => {
    return dayjs(item.date).isSame(dayjs(), 'day')
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
