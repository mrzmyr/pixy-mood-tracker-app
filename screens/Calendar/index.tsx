import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, useWindowDimensions, View } from 'react-native';
import { ChevronDown } from 'react-native-feather';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Calendar } from '../../components/Calendar';
import CalendarHeader from '../../components/CalendarHeader';
import { FloatButton } from '../../components/FloatButton';
import { useCalendarFilters } from '../../hooks/useCalendarFilters';
import useColors from '../../hooks/useColors';
import { CalendarBottomSheet } from './CalendarBottomSheet';
import { Body } from './CalendarBottomSheet/Body';

export const CalendarScreen = ({ navigation }) => {
  const colors = useColors()
  const calendarFilters = useCalendarFilters();

  const window = useWindowDimensions()
  const [scrollOffset, setScrollOffset] = useState(null);

  const calendarRef = useRef(null);
  const scrollRef = useRef(null);
  const calendarHeight = useRef(0);
  
  useEffect(() => {
    if(scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: false })
    }
  }, [scrollRef])

  useEffect(() => {
    if(calendarRef.current) {
      calendarRef.current.measure((x, y, width, height) => {
        calendarHeight.current = height;
      })
    }
  }, [calendarRef])

  return (
    <View style={{
      flex: 1,
    }}>
      <CalendarHeader />
      {(
        scrollOffset !== null && 
        scrollOffset < calendarHeight.current - window.height &&
        !calendarFilters.isOpen
      ) && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 100,
          }}
          entering={FadeIn}
          exiting={FadeOut}
        >
          <FloatButton
            onPress={() => {
              scrollRef.current.scrollToEnd({ animated: true })
            }}
          >
            <ChevronDown color={colors.palette.white} width={22} />
          </FloatButton>
        </Animated.View>
      )}
      <ScrollView
        style={{
          backgroundColor: colors.calendarBackground,
          paddingLeft: 16,
          paddingRight: 16,
          width: '100%',
        }}
        scrollEventThrottle={100}
        onScroll={e => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        ref={scrollRef}
      >
        {Platform.OS === 'web' && calendarFilters.isOpen && (
          <Body />
        )}
        <Calendar ref={calendarRef} />
      </ScrollView>
      {Platform.OS !== 'web' && (
        <CalendarBottomSheet />
      )}
    </View>
  )
}