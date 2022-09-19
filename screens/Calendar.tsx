import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { wrapScrollView } from 'react-native-scroll-into-view';
import Calendar from '../components/Calendar';
import CalendarHeader from '../components/CalendarHeader';
import Scale from '../components/Scale';
import Tag from '../components/Tag';
import TextHeadline from '../components/TextHeadline';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import useColors from '../hooks/useColors';
import { useSettings } from '../hooks/useSettings';
import { Keyboard } from 'react-native'
import LinkButton from '../components/LinkButton';
import { useLogs } from '../hooks/useLogs';
import { useTranslation } from '../hooks/useTranslation';

const CustomScrollView = wrapScrollView(ScrollView);

export const CalendarScreen = ({ navigation }) => {
  const colors = useColors()
  const { settings } = useSettings()
  const { state: logs } = useLogs();
  const windowHeight = Dimensions.get('window').height;
  const calendarFilters = useCalendarFilters()
  const [offsetY, setOffsetY] = useState(0);
  const { t } = useTranslation();

  const searchResultsCount = useMemo(() => {
    return Object.values(logs.items).filter(item => calendarFilters.validate(item)).length
  }, [logs, calendarFilters])
  
  const jumpIntoView = (ref: View) => {
    ref.measure((x, y, width, height, pageX, pageY) => {
      setOffsetY(pageY - (windowHeight / 4));
    })
  }

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
    <View style={{
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
    }}>
      <CalendarHeader />
      <CustomScrollView
        style={{
          backgroundColor: colors.calendarBackground,
          paddingLeft: 16,
          paddingRight: 16,
          width: '100%',
        }}
        scrollIntoViewOptions={{
          animated: false,
          align: 'center',
        }}
        contentOffset={{ y: offsetY }}
      >
        <Calendar jumpIntoView={jumpIntoView} navigation={navigation} />
      </CustomScrollView>
      <BottomSheet
        ref={bottomSheetRef}
        index={calendarFilters.isOpen ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleSheetChanges}
        style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.46,
          shadowRadius: 11.14,
          
          elevation: 17,
        }}
        backgroundStyle={{
          backgroundColor: colors.calendarBackground,
        }}
        handleStyle={{
          backgroundColor: colors.calendarBackground,
          height: 32,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        handleComponent={() => (
          <View
            style={{
              height: 32,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: colors.text,
              borderRadius: 2,
            }} />
          </View>
        )}
      >
        <View style={{
          backgroundColor: colors.calendarBackground,
          flex: 1,
        }}>
          <BottomSheetScrollView
            style={{
              paddingBottom: 16,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <View
              style={{
                marginBottom: 16,
              }}
            >
              <TextInput
                placeholder={t('calendar_filters_search')}
                value={calendarFilters.data.text}
                style={{
                  borderWidth: 1,
                  borderColor: colors.textInputBorder,
                  backgroundColor: colors.textInputBackground,
                  color: colors.textInputText,
                  paddingTop: 8,
                  padding: 8,
                  fontSize: 17,
                  width: '100%',
                  borderRadius: 8,
                }}
                onChangeText={(text) => {
                  calendarFilters.set({
                    ...calendarFilters.data,
                    text,
                  })
                }}
              />
            </View>
            <View
              style={{
                marginBottom: 16,
              }}
            >
              <TextHeadline style={{ marginBottom: 12 }}>{t('mood')}</TextHeadline>
              <Scale value={calendarFilters.data.ratings} onPress={onPressRating} type={settings.scaleType} />
            </View>
            <TextHeadline style={{ marginBottom: 12 }}>Tags</TextHeadline>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {settings.tags.map((tag) => (
                <Tag 
                  selected={calendarFilters.data?.tagIds?.includes(tag.id)}
                  onPress={() => onPressTag(tag)} 
                  key={tag.id} 
                  colorName={tag.color} 
                  title={tag.title} 
                />
              ))}
            </View>
            <View
              style={{
                marginTop: 16,
                marginBottom: 16
              }}
            >
              <LinkButton
                disabled={!calendarFilters.isFiltering}
                type='secondary'
                onPress={() => {
                  calendarFilters.set({
                    ...calendarFilters.data,
                    tagIds: [],
                    ratings: [],
                    text: '',
                  })
                }}
              >{t('calendar_filters_reset')}</LinkButton>
            </View>
            {calendarFilters.isFiltering && (
              <View
                style={{
                  marginTop: 8,
                  marginBottom: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textSecondary, opacity: 0.5 }}>{searchResultsCount} {t('calendar_filters_results')}</Text>
              </View>
            )}
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    </View>
  )
}