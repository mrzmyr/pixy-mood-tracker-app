import type { ViewStyle } from "react-native";
import { View } from "react-native";

const DEFAULT_STYLE = {};

/** Fixed-height footer row under a logger slide, for secondary actions. */
export const Footer = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => (
  <View
    style={{
      height: 54,
      marginTop: 16,
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      ...style,
    }}
  >
    {children}
  </View>
);
