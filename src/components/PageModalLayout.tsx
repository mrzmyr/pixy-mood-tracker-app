import type { ViewStyle } from "react-native";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_STYLE = {};

/**
 * Root layout for modal screens; adds the top safe-area inset on Android
 * only, because iOS modals already start below the status bar.
 */
export const PageModalLayout = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === "android" ? insets.top : 0,
        ...style,
      }}
    >
      {children}
    </View>
  );
};
