import { Platform, View, ViewStyle } from "react-native";

export const PageModalLayout = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        ...style,
      }}
    >
      {children}
    </View>
  );
};