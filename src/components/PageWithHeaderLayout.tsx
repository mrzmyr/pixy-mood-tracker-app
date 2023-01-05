import { View, ViewStyle } from 'react-native';

export const PageWithHeaderLayout = ({
  children,
  style = {},
}: {
  children: React.ReactNode,
  style?: ViewStyle,
}) => {
  return (
    <View
      style={{
        ...style,
      }}
    >
      {children}
    </View>
  );
}