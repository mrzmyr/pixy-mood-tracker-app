import dayjs from "dayjs"
import { Text, View } from "react-native"
import useColors from "../hooks/useColors"

const HeaderDay = ({ 
  children 
}: {
  children: string
}) => {
  const colors = useColors()
  return <Text style={{ color: colors.calendarMonthNameColor }}>{children}</Text>
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
    <HeaderDay>{dayjs().startOf('week').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(1, 'day').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(2, 'day').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(3, 'day').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(4, 'day').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(5, 'day').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs().startOf('week').add(6, 'day').format('ddd')}</HeaderDay>
  </View>
  )
}