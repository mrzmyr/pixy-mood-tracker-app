import type { ViewStyle } from "react-native";
import { View } from "react-native";

const DEFAULT_STYLE = {};

/** Root layout for stack screens that show a native header. */
export const PageWithHeaderLayout = ({
  children,
  style = DEFAULT_STYLE,
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
