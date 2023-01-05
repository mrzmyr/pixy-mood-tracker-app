import { Platform, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const PageModalLayout = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? insets.top : 0,
        ...style,
      }}
    >
      {children}
    </View>
  );
};