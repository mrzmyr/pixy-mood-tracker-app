import { View, ViewStyle } from "react-native";

export const Footer = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: ViewStyle,
}) => {
  return (
    <View
      style={{
        height: 54,
        marginTop: 16,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </View>
  );
};