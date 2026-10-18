import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseButton } from "@/components/CloseButton";
import useColors from "@/hooks/useColors";
import type { RouteModalHeaderProps } from "./RouteModalHeader";

/** Material 3 small top app bar height. */
const BAR_HEIGHT = 64;

/**
 * Material 3 full-screen dialog bar: close icon top left, left-aligned
 * title, optional text action right. No divider. Draws under the status
 * bar, so the screen needs no top inset of its own.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  action,
}: RouteModalHeaderProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="route-modal-header"
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: BAR_HEIGHT + insets.top,
        paddingTop: insets.top,
        paddingLeft: 6,
        paddingRight: 8,
      }}
    >
      <CloseButton testID={closeTestID} onPress={onClose} />
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 22,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {action ?? null}
    </View>
  );
};

export default RouteModalHeader;
