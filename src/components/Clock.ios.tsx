import DateTimePicker from '@react-native-community/datetimepicker';
import { ViewStyle } from 'react-native';
import { locale } from '@/helpers/translation';

const Clock = ({
  timeDate,
  onChange,
  style,
}: {
  timeDate: Date;
  onChange: any;
  style: ViewStyle;
}) => {
  return (
    <DateTimePicker
      locale={locale}
      testID="reminder-time"
      style={{ width: '100%', height: 35, ...style }}
      mode="time"
      value={timeDate}
      onChange={onChange}
    />
  )
}

export default Clock;