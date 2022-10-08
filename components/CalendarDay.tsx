import chroma from "chroma-js";
import { memo, useCallback, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AlignLeft } from "react-native-feather";
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
  isFuture,
  hasText,
  onPress,
}: {
  dateString: string,
  day: number,
  rating?: LogItem["rating"],
  scaleType: SettingsState["scaleType"],
  isToday: boolean,
  isFuture: boolean,
  isFiltering: boolean,
  isFiltered: boolean,
  hasText: boolean,
  onPress: any,
}) {
  const colors = useColors();
  const haptics = useHaptics();

  let backgroundColor = useMemo(() => {
    let bgcolor = (
      isFiltered ? (
        colors.calendarBackground
      ) : (
        rating ? 
          colors.scales[scaleType][rating].background : 
          colors.scales[scaleType].empty.background
      )
    )

    if(isFuture || isFiltered || (!rating && isFiltering)) {
      bgcolor = colors.calendarItemBackgroundFuture;
    }

    return bgcolor;
  }, [colors, isFiltered, rating, scaleType]);

  const textColor = useMemo(() => {
    let textColor = (
      isFiltered ? (
        colors.text
      ) : (
        rating ? 
          colors.scales[scaleType][rating].text : 
          colors.scales[scaleType].empty.text
      )
    )
    
    return textColor;
  }, [colors, isFiltered, rating, scaleType]);

  const borderColor = useMemo(() => {
    let borderColor = 'transparent';

    if(!isFiltering && !rating) {
      borderColor = colors.scales[scaleType].empty.border
    }

    return borderColor;
  }, [colors, isFiltering, rating, scaleType]);

  const borderWidth = useMemo(() => rating === undefined && !isFuture ? 2 : 0, [isFuture, rating]);
  const borderStyle = useMemo(() => !isFuture && !rating && !isFiltering ? 'dotted' : 'solid', [isFuture, rating, isFiltering]);

  const _onPress = useCallback(async () => {
    if(!isFuture) {
      await haptics.selection()
      onPress(dateString)
    }
  }, [dateString, isFuture, onPress])

  const _TextIndicator = useMemo(() => hasText && !isFiltering ? <TextIndicator textColor={textColor} /> : null, [hasText, isFiltering, textColor]);
  
  const todayIndicaorBackgroundColor = useMemo(() => {
    return (
      isToday ?
        (chroma(backgroundColor).luminance() < 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : 
        'transparent'
    )
  }, [backgroundColor, isToday]);

  const todayTextIndicatorColor = useMemo(() => {
    return (
      isToday ?
      (chroma(backgroundColor).luminance() < 0.5 ? 
        'black' :
        'white'
      ) : textColor
    )
  }, [backgroundColor, isToday, textColor]);

  const todayTextIndicatorOpacity = useMemo(() => {
    return !isToday && (isFuture || isFiltered || (!rating && isFiltering)) ? 0.3 : 1
  }, [isToday, isFuture, isFiltered, rating, isFiltering]);
  
  const activeOpacity = useMemo(() => isFiltering ? 1 : 0.8, [isFiltering]);
  
  return (
    <>
      <TouchableOpacity
        disabled={isFuture || !onPress}
        onPress={_onPress}
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          borderRadius: 8,
          backgroundColor: backgroundColor,
          width: '100%',
          aspectRatio: 1,
          borderWidth,
          borderStyle,
          borderColor,
        }}
        activeOpacity={activeOpacity}
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
            {_TextIndicator}
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
              backgroundColor: todayIndicaorBackgroundColor
            }}
          >
            <Text
              style={{
                fontSize: 12,
                opacity: todayTextIndicatorOpacity,
                color: todayTextIndicatorColor,
              }}
            >{day}</Text>
          </View>
        </View>
      </TouchableOpacity>
      </>
  );
})