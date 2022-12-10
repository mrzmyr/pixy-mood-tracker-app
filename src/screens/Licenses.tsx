import { PageWithHeaderLayout } from '@/components/PageWithHeaderLayout';
import { Text, View, VirtualizedList } from 'react-native';
import disclaimer from '../../disclaimer';
import useColors from '../hooks/useColors';

type Item = {
  key: string;
  value: string;
}

export const LicensesScreen = () => {
  const colors = useColors()
  const slices = disclaimer.split('-----');

  return (
    <PageWithHeaderLayout
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <VirtualizedList
        style={{
          padding: 16,
        }}
        data={slices}
        initialNumToRender={4}
        renderItem={({ item }: { item: Item }) => (
          <Text
            key={item.key}
            style={{
              color: colors.text,
              fontSize: 14,
            }}
          >
            {item.value}
          </Text>
        )}
        keyExtractor={item => item.key}
        getItemCount={slices => slices.length}
        getItem={(data, index): Item => ({
          key: `text-${index}`,
          value: data[index],
        })}
      />
    </PageWithHeaderLayout>
  );
}
