import dayjs from "dayjs"
import { Text, View } from "react-native"
import useColors from "../../hooks/useColors"

const HeaderDay = ({
  children
}: {
  children: string
}) => {
  const colors = useColors()
  return (
    <View
      style={{
        flex: 7,
        marginLeft: 3,
        marginRight: 3,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: 'bold',
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
    <View
      style={{
        width: '100%',
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.calendarBackground,

        shadowColor: 'rgba(0, 0, 0, 0.6)',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowRadius: 1,
        shadowOpacity: 0.2,
        elevation: 3,
        zIndex: 3,
      }}
    >
      <View style={{

        flexDirection: "row",
        justifyContent: 'space-around',
        marginLeft: -3,
        marginRight: -3,
        paddingTop: 8,
        paddingBottom: 8,
      }}>
        <HeaderDay>{dayjs().startOf('week').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(1, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(2, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(3, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(4, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(5, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{dayjs().startOf('week').add(6, 'day').format('ddd')}</HeaderDay>
      </View>
    </View>
  )
}