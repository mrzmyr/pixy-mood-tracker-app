import dayjs, { Dayjs } from 'dayjs';
import { Text, View } from 'react-native';
import useColors from '../../hooks/useColors';

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
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.statisticsWeekdayText,
          textAlign: 'center',
        }}
      >{children}</Text>
    </View>
  )
}

export const HeaderWeek = ({
  date,
}: {
  date: string,
}) => {
  const colors = useColors();
  const start = dayjs(date)

  return (
    <View
      style={{
        width: '100%',
      }}
    >
      <View style={{
        flexDirection: "row",
        justifyContent: 'space-around',
        borderTopColor: colors.statisticsWeekdayBorder,
        borderTopWidth: 1,
        borderBottomColor: colors.statisticsWeekdayBorder,
        borderBottomWidth: 1,
        paddingTop: 8,
        paddingBottom: 8,
      }}>
        <HeaderDay>{start.add(0, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(1, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(2, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(3, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(4, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(5, 'day').format('ddd')}</HeaderDay>
        <HeaderDay>{start.add(6, 'day').format('ddd')}</HeaderDay>
      </View>
    </View>
  );
};
