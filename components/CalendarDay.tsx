import { useNavigation, useTheme } from "@react-navigation/native";
import dayjs from "dayjs";
import { memo, useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AlignLeft } from "react-native-feather";
import Colors from "../constants/Colors";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";
import { LogItem } from "../hooks/useLogs";
import useScale from "../hooks/useScale";
import { useSettings } from "../hooks/useSettings";

export default memo(function CalendarDay({ 
  dateString,
  day,
  item = {},
  isToday,
  isFuture,
  hasText,
  onPress,
}: {
  dateString: string,
  day: number,
  item: LogItem | {},
  isToday: boolean,
  isFuture: boolean,
  hasText: boolean,
  onPress: any,
}) {
  const colors = useColors();
  // const navigation = useNavigation();
  const haptics = useHaptics();
  const { settings } = useSettings();
  const { colors: scaleColors } = useScale(settings.scaleType)

  // console.log('render', dateString);
  
  const backgroundColor = item.rating ? 
    scaleColors[item.rating].background : 
    colors.calendarItemBackground;
  const textColor = item.rating ? 
    scaleColors[item.rating].text : 
    colors.calendarItemTextColor;
  
  return (
    <>
      <TouchableOpacity
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
          backgroundColor: backgroundColor,
          width: '100%',
          aspectRatio: 1,
          opacity: isFuture ? 0.5 : 1,
        }}
        testID={`calendar-day-${dateString}`}
        accessible={true}
        accessibilityLabel={`${dayjs(dateString).format('LL')}`}
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
              padding: 2,
              paddingLeft: 3,
              paddingRight: 3,
              borderRadius: 3,
              backgroundColor: isToday ? colors.calendarItemTodayBackground : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: isToday ? colors.calendarItemTodayColor : textColor,
              }}
            >{day}</Text>
          </View>
      </TouchableOpacity>
      </>
  );
})