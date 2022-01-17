import { Text, View } from "react-native"
import useColors from "../hooks/useColors"

const HeaderDay = ({ children }) => {
  const colors = useColors()
  return <View><Text style={{ color: colors.calendarMonthNameColor }}>{children}</Text></View>
}

export default function CalendarHeader() {
  const colors = useColors()
  
  return (
    <View style={{
      width: '100%',
      backgroundColor: colors.background,
      // backgroundColor: 'red',
      alignSelf: 'center',
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      shadowOffset: {
        width: 0,
        height: 1
      },
      shadowRadius: 3,
      shadowOpacity: 0.3,
      elevation: 3,
      zIndex: 3,
      justifyContent: 'space-around',
      alignItems: 'center',
      flexDirection: 'row',
      paddingLeft: 15,
      paddingRight: 15,
      paddingTop: 10,
      paddingBottom: 10,
  }}>
    <HeaderDay>Mon</HeaderDay>
    <HeaderDay>Tue</HeaderDay>
    <HeaderDay>Wed</HeaderDay>
    <HeaderDay>Thu</HeaderDay>
    <HeaderDay>Fri</HeaderDay>
    <HeaderDay>Sat</HeaderDay>
    <HeaderDay>Sun</HeaderDay>
  </View>
  )
}