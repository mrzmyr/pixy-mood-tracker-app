import chroma from "chroma-js";
import { memo } from "react";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { AlignLeft } from "react-native-feather";
import { CalendarFiltersData } from "../hooks/useCalendarFilters";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";
import { LogItem } from "../hooks/useLogs";
import { SettingsState } from "../hooks/useSettings";

const TextIndicator = ({
  textColor,
}: {
  textColor: string;
}) => (
  <View style={{
    opacity: 0.5,
  }}><AlignLeft color={textColor} width={10} height={10} /></View>
)

export default memo(function CalendarDay({ 
  dateString,
  day,
  rating,
  scaleType,
  isToday,
  isFiltered,
  isFiltering,
  filters,
  isFuture,
  hasText,
  onPress,
}: {
  dateString: string,
  day: number,
  rating?: LogItem["rating"],
  scaleType: SettingsState["scaleType"],
  isToday: boolean,
  filters: CalendarFiltersData,
  isFuture: boolean,
  isFiltering: boolean,
  isFiltered: boolean,
  hasText: boolean,
  onPress: any,
}) {
  const colors = useColors();
  const haptics = useHaptics();

  let backgroundColor = (
    isFiltered ? (
      colors.calendarBackground
    ) : (
      rating ? 
        colors.scales[scaleType][rating].background : 
        colors.scales[scaleType].empty.background
    )
  )

  if(isFuture || isFiltered || (!rating && isFiltering)) {
    backgroundColor = colors.calendarItemBackgroundFuture;
  }

  const textColor = (
    isFiltered ? (
      colors.text
    ) : (
      rating ? 
        colors.scales[scaleType][rating].text : 
        colors.scales[scaleType].empty.text
    )
  )

  let borderColor = 'transparent';
  if(!isFiltering && !rating) {
    borderColor = colors.scales[scaleType].empty.border
  }
  
  return (
    <>
      <TouchableOpacity
        disabled={isFuture || !onPress}
        onPress={async () => {
          if(!isFuture) {
            await haptics.selection()
            onPress(dateString)
          }
        }}
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          borderRadius: 8,
          backgroundColor: backgroundColor,
          width: '100%',
          aspectRatio: 1,
          borderWidth: rating === undefined && !isFuture ? 2 : 0,
          borderStyle: !isFuture && !rating && !isFiltering ? 'dotted' : 'solid',
          borderColor: borderColor,
        }}
        activeOpacity={isFiltering ? 1 : 0.8}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            height: '50%',
            width: '100%',
          }}
        >
          <View
            style={{
              width: '30%',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            { hasText && !isFiltering && <TextIndicator textColor={textColor} />}
          </View>
        </View>
        <View
          style={{
            width: '100%',
            height: '50%',
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 20,
              minWidth: 20,
              borderRadius: 100,
              backgroundColor: isToday ? 
                (chroma(backgroundColor).luminance() < 0.5 ? 
                  'rgba(255,255,255,0.7)' : 
                  'rgba(0,0,0,0.5)'
                ) : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                opacity: !isToday && (isFuture || isFiltered || (!rating && isFiltering)) ? 0.3 : 1,
                color: isToday ?
                  (chroma(backgroundColor).luminance() < 0.5 ? 
                    'black' :
                    'white'
                  ) : textColor,
              }}
            >{day}</Text>
          </View>
        </View>
      </TouchableOpacity>
      </>
  );
})