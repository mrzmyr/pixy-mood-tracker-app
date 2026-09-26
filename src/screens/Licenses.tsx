import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import { Text, VirtualizedList } from "react-native";
import disclaimer from "../../disclaimer";
import useColors from "@/hooks/useColors";

interface Item {
  key: string;
  value: string;
}

/**
 * Settings > Licenses: third-party notices from `disclaimer.js`, one list
 * item per `-----` section.
 */
export const LicensesScreen = () => {
  const colors = useColors();
  const slices = disclaimer.split("-----");

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
        keyExtractor={(item) => item.key}
        getItemCount={(items) => items.length}
        getItem={(data, index): Item => ({
          key: `text-${index}`,
          value: data[index],
        })}
      />
    </PageWithHeaderLayout>
  );
};
