import type { ReactNode } from "react";
import { View } from "react-native";
import { TagListItem } from "./TagListItem";

/** Tag row; iOS adds swipe actions in `TagRow.ios.tsx`. */
export const TagRow = ({
  dragHandle,
  ...props
}: React.ComponentProps<typeof TagListItem> & {
  /** Reorder control, drawn over the row's trailing edge. */
  dragHandle?: ReactNode;
}) => (
  <View>
    <TagListItem {...props} />
    {dragHandle && (
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0 }}>
        {dragHandle}
      </View>
    )}
  </View>
);
