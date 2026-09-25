import type { ViewStyle } from "react-native";
import { View } from "react-native";

const DEFAULT_STYLE = {};

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
