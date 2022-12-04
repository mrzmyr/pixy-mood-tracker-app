import { Pressable, View } from 'react-native';
import useColors from '@/hooks/useColors';

export const PasscodePadIcon = ({
  icon, onPress,
}: {
  icon: React.ReactNode;
  onPress: () => void;
}) => {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => onPress()}
      style={({ pressed }) => ({
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 999,
        width: 80,
        height: 80,
        opacity: pressed ? 0.5 : 1,
        margin: 10,
      })}
    >

      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </View>
    </Pressable>
  );
};
