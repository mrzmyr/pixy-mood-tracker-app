import { View } from 'react-native';
import Calendar from '../components/Calendar';
import useColors from '../hooks/useColors';

export default function CalendarScreen({}) {
  const colors = useColors()

  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      flexDirection: "column",
      marginTop: 20,
      backgroundColor: colors.background,
    }}>
      <Calendar />
    </View>
  );
}