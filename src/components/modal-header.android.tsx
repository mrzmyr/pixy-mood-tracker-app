import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";

/** Material 3 full-screen dialog header height. */
const BAR_HEIGHT = 56;

const DEFAULT_STYLE = {};

/**
 * Android header drawn in a sheet or screen: Material 3 full-screen dialog
 * layout. Close leads, start-aligned title, one action trails. No divider.
 * Same props as `modal-header.tsx`.
 */
const ModalHeader = ({
  title = "",
  right = null,
  left = null,
  style = DEFAULT_STYLE,
}: {
  title?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          height: BAR_HEIGHT,
          paddingLeft: 6,
          paddingRight: 8,
        },
        style,
      ]}
    >
      {left}
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ flex: 1, marginLeft: 10, fontSize: 22, color: colors.text }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
};

export default ModalHeader;
