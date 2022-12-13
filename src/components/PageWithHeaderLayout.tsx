import { useHeaderHeight } from '@react-navigation/elements';
import { Platform, View, ViewStyle } from 'react-native';

export const PageWithHeaderLayout = ({
  children,
  style = {},
}: {
  children: React.ReactNode,
  style?: ViewStyle,
}) => {
  const headerHeight = useHeaderHeight();

  return (
    <View
      style={{
        paddingTop: Platform.OS === 'android' ? headerHeight : 0,
        ...style,
      }}
    >
      {children}
    </View>
  );
}