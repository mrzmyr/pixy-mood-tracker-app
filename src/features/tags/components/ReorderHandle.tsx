import { GripVertical, Menu } from "lucide-react-native";
import { Platform, View } from "react-native";
import Sortable from "react-native-sortables";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** HIG minimum touch target. */
const SIZE = 44;

/**
 * Drag handle of a sortable row: iOS reorder lines, Material drag
 * indicator on Android. Screen readers get Move Up and Move Down actions
 * instead of the drag.
 */
export const ReorderHandle = ({
  label,
  testID,
  onMove,
}: {
  /** Names the row, for example "Reorder Sport". */
  label: string;
  testID: string;
  onMove: (offset: -1 | 1) => void;
}) => {
  const colors = useColors();
  const Icon = Platform.OS === "ios" ? Menu : GripVertical;

  return (
    <Sortable.Handle style={{ flex: 1 }}>
      <View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityActions={[
          { name: "moveUp", label: t("tags_move_up") },
          { name: "moveDown", label: t("tags_move_down") },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          onMove(nativeEvent.actionName === "moveUp" ? -1 : 1);
        }}
        style={{
          width: SIZE,
          minHeight: SIZE,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={colors.textSecondary} />
      </View>
    </Sortable.Handle>
  );
};
