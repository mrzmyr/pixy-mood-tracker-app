import dayjs from "dayjs"
import { Text, View } from "react-native"
import useColors from "../hooks/useColors"

const HeaderDay = ({ 
  children 
}: {
  children: string
}) => {
  const colors = useColors()
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
     <Text 
      style={{ 
        fontSize: 12, 
        width: '100%', 
        color: colors.calendarWeekNameColor,
        textAlign: 'center',
      }}
      >{children}</Text>
    </View>
  )
}

export default function CalendarHeader() {
  const colors = useColors()
  
  return (
    <View style={{
      width: '100%',
      backgroundColor: colors.calendarBackground,
      alignSelf: 'center',
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowRadius: 1,
      shadowOpacity: 0.2,
      elevation: 3,
      zIndex: 3,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 4,
      paddingBottom: 4,
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