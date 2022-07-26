import { Pressable, Text } from 'react-native';
import { Check } from 'react-native-feather';
import useColors from '../../hooks/useColors';
import { Tag } from '../../hooks/useSettings';

export function ColorDot({
  color, onPress, isSelected,
}: {
  color: Tag['color'];
  onPress: () => void;
  isSelected: boolean;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={{
        margin: 4,
        backgroundColor: colors.tags[color].background,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        width: 32,
        height: 32,
        borderWidth: 2,
        borderColor: colors.tags[color].border,
      }}
    >
      {isSelected ?
        <Check strokeWidth={4} color={colors.tags[color].text} width={14} /> :
        <Text>&nbsp;</Text>}
    </Pressable>
  );
}
