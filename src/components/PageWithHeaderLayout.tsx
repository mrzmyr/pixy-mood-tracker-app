import type { ViewStyle } from "react-native";
import { View } from "react-native";

export const PageWithHeaderLayout = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => (
  <View
    style={{
      ...style,
    }}
  >
    {children}
  </View>
);
