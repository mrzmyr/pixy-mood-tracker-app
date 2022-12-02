import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Circle } from 'react-native-feather';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';

export function Radio({
  onPress, children, isSelected = false,
  isDisabled = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
  isDisabled?: boolean;
}) {
  const colors = useColors();
  const haptics = useHaptics();

  const _onPress = useCallback(() => {
    if (!isDisabled) {
      haptics.selection();
      onPress();
    }
  }, [onPress, isDisabled]);

  return (
    <Pressable
      onPress={_onPress}
      style={({ pressed }) => [{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: colors.menuListItemBackground,
        padding: 16,
        borderRadius: 10,
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
      }]}
    >
      <>
        <View style={{
          justifyContent: 'center',
          flexDirection: 'row',
          position: 'relative',
          marginRight: 16,
          marginLeft: 8,
        }}>
          <Circle width={24} color={isDisabled ? colors.textSecondary : colors.text} />
          {isSelected &&
            <View style={{
              width: 10,
              height: 10,
              backgroundColor: isDisabled ? colors.textSecondary : colors.text,
              position: 'absolute',
              borderRadius: 100,
              top: 7
            }}></View>}
        </View>
        <View
          style={{
            flex: 1,
          }}
        >
          {children}
        </View>
      </>
    </Pressable>
  );
}
