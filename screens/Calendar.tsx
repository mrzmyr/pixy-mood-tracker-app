import { View } from 'react-native';
import Calendar from '../components/Calendar';

export default function CalendarScreen({}) {
  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      flexDirection: "column",
    }}>
      <Calendar />
    </View>
  );
}