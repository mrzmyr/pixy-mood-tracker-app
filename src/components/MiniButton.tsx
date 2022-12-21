import { Pressable, Text } from 'react-native';
import { Edit2 } from 'react-native-feather';
import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';

export const MiniButton = ({
  onPress,
  children,
}: {
  onPress: () => void,
  children: React.ReactNode,
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <Pressable
      style={({ pressed }) => [{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        backgroundColor: colors.miniButtonBackground,
        opacity: pressed ? 0.8 : 1,
        marginRight: 8,
        marginBottom: 8,
      }]}
      onPress={async () => {
        await haptics.selection()
        onPress?.();
      }}
      testID={'log-tags-edit'}
      accessibilityRole={'button'}
    >
      <Edit2
        color={colors.miniButtonText}
        width={17}
        style={{ margin: -4, marginRight: 4, }} />
      <Text
        style={{
          color: colors.miniButtonText,
          fontSize: 17,
          fontWeight: '500',
        }}
      >{children}</Text>
    </Pressable>
  );
};
