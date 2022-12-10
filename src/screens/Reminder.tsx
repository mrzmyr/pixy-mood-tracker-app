import { PageWithHeaderLayout } from '@/components/PageWithHeaderLayout';
import Reminder from '@/components/Reminder';
import { ScrollView } from 'react-native';
import useColors from '../hooks/useColors';

export const ReminderScreen = () => {
  const colors = useColors()

  return (
    <PageWithHeaderLayout
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
    </PageWithHeaderLayout>
  );
}
