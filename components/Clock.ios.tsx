import DateTimePicker from '@react-native-community/datetimepicker';

const Clock = ({
  timeDate,
  onChange
}: {
  timeDate: Date;
  onChange: any;
}) => {
  return (
    <DateTimePicker
      testID="reminder-time"
      style={{ width: '100%', height: 35 }} 
      mode="time" 
      value={timeDate}
      onChange={onChange}
    />
  )
}

export default Clock;