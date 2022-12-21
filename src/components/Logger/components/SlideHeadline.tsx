import { Text, View, ViewStyle } from 'react-native';
import useColors from '@/hooks/useColors';

export const SlideHeadline = ({
  children,
  style = {},
}: {
  children: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        ...style,
      }}
    >
      <Text style={{
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold',
      }}>{children}</Text>
    </View>
  );
};
