import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef } from 'react';
import { Keyboard, View } from 'react-native';
import { useCalendarFilters } from '../../../hooks/useCalendarFilters';
import useColors from '../../../hooks/useColors';
import { Body } from './Body';

export const CalendarBottomSheet = () => {
  const colors = useColors()
  const calendarFilters = useCalendarFilters()

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['30%', '50%', '90%'], []);

  useEffect(() => {
    if (calendarFilters.isOpen) {
      if (bottomSheetRef.current !== null) {
        bottomSheetRef.current.snapToIndex(1)
      }
    } else {
      if (bottomSheetRef.current !== null) {
        bottomSheetRef.current.close()
      }
    }
  }, [calendarFilters.isOpen])

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      Keyboard.dismiss()
      calendarFilters.close()
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={calendarFilters.isOpen ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      style={{
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 11,
        },
        shadowOpacity: calendarFilters.isOpen ? 1 : 0,
        shadowRadius: 14.78,

        elevation: 22,
      }}
      backgroundStyle={{
        backgroundColor: colors.bottomSheetBackground,
      }}
      handleComponent={() => (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {calendarFilters.isOpen && (
            <View style={{
              width: 40,
              height: 4,
              marginTop: -16,
              backgroundColor: colors.bottomSheetHandle,
              borderRadius: 2,
            }} />
          )}
        </View>
      )}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps='handled'
      >
        <Body />
      </BottomSheetScrollView>
    </BottomSheet>
  )
}