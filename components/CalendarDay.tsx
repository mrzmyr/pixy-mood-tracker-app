import chroma from "chroma-js"
import dayjs from "dayjs";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AlignLeft } from "react-native-feather";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";
import { LogItem } from "../hooks/useLogs";
import useScale from "../hooks/useScale";
import { useSettings } from "../hooks/useSettings";

export default memo(function CalendarDay({ 
  dateString,
  day,
  rating,
  isToday,
  isFuture,
  hasText,
  onPress,
}: {
  dateString: string,
  day: number,
  rating?: LogItem["rating"],
  isToday: boolean,
  isFuture: boolean,
  hasText: boolean,
  onPress: any,
}) {
  const colors = useColors();
  const haptics = useHaptics();
  const { settings } = useSettings();
  const { colors: scaleColors } = useScale(settings.scaleType)

  const backgroundColor = rating ? 
    scaleColors[rating].background : 
    colors.calendarItemBackground;
  const textColor = rating ? 
    scaleColors[rating].text : 
    colors.calendarItemTextColor;
  
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
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          padding: 5,
          borderRadius: 3,
          backgroundColor: isFuture ? colors.calendarItemBackgroundFuture : backgroundColor,
          width: '100%',
          aspectRatio: 1,
        }}
        testID={`calendar-day-${dateString}`}
        accessible={true}
        accessibilityLabel={`${dayjs(dateString).format('LL')}`}
        dataSet={{ 
          rating: rating ? rating : 'none',
        }}
      >
          { hasText && 
            <View style={{
              position: "absolute",
              top: 5,
              right: 5,
              opacity: 0.5,
            }}><AlignLeft color={textColor} width={10} height={10} /></View>
          }
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              padding: 3,
              aspectRatio: 1,
              borderRadius: 100,
              backgroundColor: isToday ? 
                (chroma(backgroundColor).luminance() < 0.6 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.15)') : 
                'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                opacity: isFuture ? 0.5 : 1,
                color: isToday ? 
                (chroma(backgroundColor).luminance() > 0.6 ? 'black' : 'black') :
                textColor,
              }}
            >{day}</Text>
          </View>
      </TouchableOpacity>
      </>
  );
})