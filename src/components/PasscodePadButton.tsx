import { Pressable, Text, View } from 'react-native';
import useColors from '@/hooks/useColors';

export const PasscodePadButton = ({
  value, onPress
}: {
  value: string;
  onPress: (value: string) => void;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 999,
        width: 80,
        height: 80,
        margin: 10,
        backgroundColor: pressed ? colors.passcodePadBackgroundActive : colors.passcodePadBackground,
      })}
    >
      {typeof value === 'string' ?
        <Text
          style={{
            fontSize: 28,
            color: colors.text,
            marginTop: -3,
            padding: 25,
          }}
        >
          {value}
        </Text> :
        <View
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {value}
        </View>}
    </Pressable>
  );
};
