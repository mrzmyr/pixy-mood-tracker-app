import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { Pressable, Text, View } from "react-native";
import { AlignLeft } from "react-native-feather";
import useColors from "../hooks/useColors";
import { useLogs } from "../hooks/useLogs";
import useScale from "../hooks/useScale";
import { useSettings } from "../hooks/useSettings";
import { invertColor } from "../lib/utils";

export default function CalendarDay({ 
  date 
}: {
  date: {
    dateString: string,
    day: number,
  },
}) {
  const { state } = useLogs();
  const colors = useColors();
  const navigation = useNavigation();
  const { settings } = useSettings();
  const { colors: scaleColors } = useScale(settings.scaleType)

  const item = state.items[date.dateString] || {};
  const isFutute = dayjs(date.dateString).isAfter(dayjs());
  
  const backgroundColor = item.rating ? 
    scaleColors[item.rating].background : 
    colors.calendarItemBackground;
  const textColor = item.rating ? 
    scaleColors[item.rating].text : 
    colors.calendarItemTextColor;
  const message = item.message || '';
  
  return (
    <>
      <Pressable
        onPress={() => navigation.navigate('LogModal', { date: date.dateString })}
        style={({ pressed }) => [{
          opacity: isFutute ? 0.5 : pressed ? 0.8 : 1,
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          padding: 5,
          borderRadius: 3,
          backgroundColor: backgroundColor,
          width: '100%',
          aspectRatio: 1,
        }]}
        accessible={true}
        accessibilityLabel={`${dayjs(date.dateString).format('LL')}`}
      >
          { message.length > 0 && 
            <View style={{
              position: "absolute",
              top: 5,
              right: 5,
              opacity: 0.5,
            }}><AlignLeft color={textColor} width={10} height={10} /></View>
          }
          <View
            style={{
              padding: 3,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: textColor,
              }}
            >{date.day}</Text>
          </View>
          { date.dateString === dayjs().format('YYYY-MM-DD') && <View style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              aspectRatio: 1,
              borderWidth: 1,
              borderColor: invertColor(backgroundColor),
              opacity: 0.5,
              position: 'absolute',
              borderRadius: 3,
              margin: 2,
            }} />
          }
      </Pressable>
      </>
  );
}