import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef } from 'react';
import { Keyboard, View } from 'react-native';
import { useCalendarFilters } from '../../../hooks/useCalendarFilters';
import useColors from '../../../hooks/useColors';
import { useLogs } from '../../../hooks/useLogs';
import { useSettings } from '../../../hooks/useSettings';
import { Header } from './Header';
import { RatingSection } from './RatingSection';
import { ResultsSection } from './ResultsSection';
import { SearchInputSection } from './SearchInputSection';
import { TagsSection } from './TagsSection';

export const CalendarBottomSheet = () => {
  const colors = useColors()
  const { settings } = useSettings()
  const { state: logs } = useLogs();
  const calendarFilters = useCalendarFilters()

  const searchResultsCount = useMemo(() => {
    return Object.values(logs.items).filter(item => calendarFilters.validate(item)).length
  }, [logs, calendarFilters])
  
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);
  
  useEffect(() => {
    if(calendarFilters.isOpen) {
      bottomSheetRef.current.snapToIndex(1)
    } else {
      bottomSheetRef.current.close()
    }
  }, [calendarFilters.isOpen])

  const handleSheetChanges = (index: number) => {
    if(index === -1) {
      Keyboard.dismiss()
      calendarFilters.set({
        ...calendarFilters.data,
        isOpen: false,
      })
    }
  };

  const onPressTag = (tag) => {
    calendarFilters.set({
      ...calendarFilters.data,
      tagIds: calendarFilters.data.tagIds.includes(tag.id) ? 
        calendarFilters.data.tagIds.filter(t => t !== tag.id) : 
        [...calendarFilters.data.tagIds, tag.id]
    })
  }

  const onPressRating = (rating) => {
    calendarFilters.set({
      ...calendarFilters.data,
      ratings: calendarFilters.data.ratings.includes(rating) ? 
        calendarFilters.data.ratings.filter(r => r !== rating) : 
        [...calendarFilters.data.ratings, rating]
    })
  }
  
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
        shadowOpacity: 1,
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
        <Header />
        <View
          style={{
            padding: 16,
          }}
        >
          <SearchInputSection 
            value={calendarFilters.data.text}
            onChange={(text) => {
              calendarFilters.set({
                ...calendarFilters.data,
                text,
              })
            }}
          />
          <RatingSection
            value={calendarFilters.data.ratings}
            onChange={onPressRating}
          />
          <TagsSection
            tags={settings.tags}
            selectedTags={settings.tags.filter(tag => calendarFilters.data.tagIds.includes(tag.id))}
            onSelect={onPressTag}
          />
          <ResultsSection
            count={searchResultsCount}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}