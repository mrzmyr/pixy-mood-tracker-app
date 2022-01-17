import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native"
import { AlignLeft } from "react-native-feather";
import useColors from "../hooks/useColors"
import { useLogs } from "../hooks/useLogs";

export default function CalendarDay({ date }) {
  const { state } = useLogs();
  const colors = useColors();
  const navigation = useNavigation();

  const item = state.items[date.dateString] || {};

  const backgroundColor = item.rating ? colors.rating[item.rating].background : colors.calendarItemBackground;
  const textColor = item.rating ? colors.rating[item.rating].text : colors.calendarItemTextColor;
  const message = item.message || '';
  
  return (
    <Pressable
      onPress={() => navigation.navigate('LogModal', { date: date.dateString })}
      style={({ pressed }) => [{
        flex: 1, 
         opacity: pressed ? 0.5 : 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 5,
        borderRadius: 3,
        backgroundColor: backgroundColor,
        marginBottom: -10,
        width: '90%',
        height: 45,
      }]}
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
          fontSize: 12,
          color: textColor,
        }}
      >{date.day}</Text>
    </View>
    </Pressable>
  );
}