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
    <HeaderDay>{dayjs('2022-01-17').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-18').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-19').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-20').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-21').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-22').format('ddd')}</HeaderDay>
    <HeaderDay>{dayjs('2022-01-23').format('ddd')}</HeaderDay>
  </View>
  )
}