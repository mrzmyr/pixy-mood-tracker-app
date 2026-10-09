import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TagListContent } from "./TagListContent";
import { TagRow } from "./TagRow";

/** Native gesture swipes keep existing menu rows; SwiftUI List enforces taller rows on iOS 26. */
export const TagList = (
  props: Omit<React.ComponentProps<typeof TagListContent>, "ItemComponent">
) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
    >
      <TagListContent {...props} ItemComponent={TagRow} />
    </ScrollView>
  );
};
