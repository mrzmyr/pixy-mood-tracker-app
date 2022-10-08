import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
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

  const [scrollOffset, setScrollOffset] = useState(0);

  const scrollRef = useRef(null);
  
  useEffect(() => {
    if(scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: false })
    }
  }, [scrollRef])

  return (
    <View style={{
      flex: 1,
    }}>
      <CalendarHeader />
      
      {scrollOffset < 3400 && (
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
        scrollEventThrottle={16}
        onScroll={e => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        ref={scrollRef}
      >
        {Platform.OS === 'web' && calendarFilters.isOpen && (
          <Body />
        )}
        <Calendar />
      </ScrollView>
      {Platform.OS !== 'web' && (
        <CalendarBottomSheet />
      )}
    </View>
  )
}