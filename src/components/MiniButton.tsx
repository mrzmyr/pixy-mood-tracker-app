import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';
import { Pressable, Text, ViewStyle } from 'react-native';

export const MiniButton = ({
  onPress,
  children,
  icon,
  style = {},
  variant = 'primary',
}: {
  onPress: () => void,
  children: React.ReactNode,
  icon?: React.ReactNode,
  style?: ViewStyle,
  variant?: 'primary' | 'secondary' | 'tertiary',
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  const buttonColors = {
    primary: {
      background: colors.primaryButtonBackground,
      text: colors.primaryButtonText,
      border: colors.primaryButtonBorder,
      disabledBackground: colors.primaryButtonBackgroundDisabled,
      disabledText: colors.primaryButtonTextDisabled,
      disabledBorder: colors.primaryButtonBorderDisabled,
    },
    secondary: {
      background: colors.secondaryButtonBackground,
      text: colors.secondaryButtonText,
      border: colors.secondaryButtonBorder,
      disabledBorder: colors.secondaryButtonBorderDisabled,
      disabledBackground: colors.secondaryButtonBackgroundDisabled,
      disabledText: colors.secondaryButtonTextDisabled,
    },
    tertiary: {
      background: colors.tertiaryButtonBackground,
      text: colors.tertiaryButtonText,
      border: colors.tertiaryButtonBorder,
      disabledBorder: colors.tertiaryButtonBorderDisabled,
    },
  }[variant];

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
        backgroundColor: buttonColors.background,
        opacity: pressed ? 0.8 : 1,
        marginRight: 8,
        marginBottom: 8,
        ...style,
      }]}
      onPress={async () => {
        await haptics.selection()
        onPress?.();
      }}
      testID={'log-tags-edit'}
      accessibilityRole={'button'}
    >
      {icon}
      <Text
        style={{
          color: buttonColors.text,
          fontSize: 17,
          fontWeight: '500',
        }}
      >{children}</Text>
    </Pressable>
  );
};
