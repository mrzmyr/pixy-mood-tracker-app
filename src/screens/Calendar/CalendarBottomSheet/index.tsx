import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalendarFilters } from '../../../hooks/useCalendarFilters';
import useColors from '../../../hooks/useColors';
import { Body } from './Body';

export const CalendarBottomSheet = () => {
  if (Platform.OS === 'ios') {
    return <IOSCalendarBottomSheet />;
  }

  return <GestureCalendarBottomSheet />;
};

const IOSCalendarBottomSheet = () => {
  const colors = useColors();
  const calendarFilters = useCalendarFilters();
  const insets = useSafeAreaInsets();

  const close = () => {
    Keyboard.dismiss();
    calendarFilters.close();
  };

  return (
    <Modal
      animationType='slide'
      onRequestClose={close}
      presentationStyle='overFullScreen'
      statusBarTranslucent
      transparent
      visible={calendarFilters.isOpen}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessible={false}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            height: '50%',
            paddingBottom: insets.bottom,
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
          }}
        >
          <ScrollView keyboardShouldPersistTaps='handled'>
            <Body onClose={close} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const GestureCalendarBottomSheet = () => {
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
      accessible={false}
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
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          accessible={false}
        />
      )}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps='handled'
      >
        <Body />
      </BottomSheetScrollView>
    </BottomSheet>
  )
};
