import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";
import LoadingIndicator from "./LoadingIndicator";
import useHaptics from "../hooks/useHaptics";
import _ from "lodash";

export default function Button({
  type = 'primary',
  icon,
  testID,
  onPress,
  isLoading = false,
  disabled = false,
  children,
  style = {},
}: {
  type?: 'primary' | 'secondary' | 'danger' | 'inverse';
  icon?: React.ReactNode,
  testID?: string,
  isLoading?: boolean,
  disabled?: boolean,
  children: React.ReactNode,
  style?: React.CSSProperties,
  onPress?: () => void,
}) {
  const colors = useColors()
  const haptics = useHaptics()

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
    },
    danger: {
      background: colors.dangerButtonBackground,
      text: colors.dangerButtonText,
      border: colors.dangerButtonBorder,
    },
  }[type];

  return (
    <Pressable
      style={({ pressed }) => [{
        padding: 16,
        paddingRight: 16,
        paddingLeft: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderRadius: 8,
        opacity: disabled ? 0.5 : (pressed ? 0.6 : 1),
        backgroundColor: disabled ? buttonColors.disabledBackground : buttonColors.background,
        borderWidth: 2,
        borderColor: disabled ? buttonColors.disabledBorder : buttonColors?.border,
      }, style]}
      onPress={async () => {
        await haptics.selection()
        if (!disabled) {
          onPress?.()
        }
      }}
      disabled={disabled}
      testID={testID}
      accessibilityRole={'button'}
    >
      {isLoading ? (
        <LoadingIndicator size={20} color={buttonColors?.text} />
      ) : (
        <>
          {icon && <View style={{ marginRight: children ? 8 : 0 }}>{icon}</View>}
          {_.isString(children) ? (
            <Text
              style={{
                fontSize: 17,
                color: disabled ? buttonColors.disabledText : buttonColors.text,
                fontWeight: 'bold'
              }}
              numberOfLines={1}
            >{children}</Text>
          ) : children}
        </>
      )}
    </Pressable>
  )
}