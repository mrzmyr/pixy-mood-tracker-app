import { Pressable, Text } from 'react-native';
import { Check } from 'react-native-feather';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { Tag } from '../../hooks/useSettings';

export function ColorDot({
  color, onPress, isSelected,
}: {
  color: Tag['color'];
  onPress: () => void;
  isSelected: boolean;
}) {
  const haptics = useHaptics()
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        haptics.selection()
        onPress()
      }}
      style={({ pressed }) => [{
        margin: 4,
        backgroundColor: colors.tags[color].background,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        width: 32,
        height: 32,
        borderWidth: 2,
        borderColor: colors.tags[color].border,
        opacity: pressed ? 0.8 : 1,
      }]}
    >
      {isSelected ?
        <Check strokeWidth={4} color={colors.tags[color].text} width={14} /> :
        <Text>&nbsp;</Text>}
    </Pressable>
  );
}
