import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Pressable, Text } from 'react-native';
import useColors from '../hooks/useColors';

const Clock = ({
  timeDate,
  onChange
}: {
  timeDate: Date;
  onChange: any;
}) => {
  const colors = useColors()
  
  return (
    <Pressable 
      onPress={() => {
        DateTimePickerAndroid.open({
          value: timeDate,
          is24Hour: true,
          mode: 'time',
          onChange,
        })
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 5,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>{dayjs(timeDate).format('HH:mm')}</Text>
    </Pressable>
  )
}

export default Clock;