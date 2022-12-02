import { ScrollView, View } from 'react-native';
import Reminder from '@/components/Reminder';
import useColors from '../hooks/useColors';

export const ReminderScreen = () => {
  const colors = useColors()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView style={{
        padding: 20,
      }}>
        <Reminder />
      </ScrollView>
    </View>
  );
}
