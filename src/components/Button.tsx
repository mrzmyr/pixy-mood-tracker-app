import isString from "lodash/isString";
import { Pressable, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

const DEFAULT_STYLE = {};

const getPressableOpacity = (
  isDisabled: boolean | undefined,
  isPressed: boolean
) => {
  if (isDisabled) {
    return 0.5;
  }
  return isPressed ? 0.8 : 1;
};

const Button = ({
  type = "primary",
  size = "default",
  icon,
  testID,
  onPress,
  disabled = false,
  children,
  style = DEFAULT_STYLE,
}: {
  type?: "primary" | "secondary" | "danger" | "tertiary";
  size?: "default" | "small";
  icon?: React.ReactNode;
  testID?: string;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  const isSmall = size === "small";

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
    danger: {
      background: colors.dangerButtonBackground,
      text: colors.dangerButtonText,
      border: colors.dangerButtonBorder,
    },
  }[type];

  return (
    <Pressable
      style={({ pressed }) => ({
        padding: isSmall ? 8 : 16,
        paddingRight: isSmall ? 12 : 16,
        paddingLeft: isSmall ? 12 : 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderRadius: isSmall ? 10 : 12,
        opacity: getPressableOpacity(disabled, pressed),
        backgroundColor: disabled
          ? buttonColors.disabledBackground
          : buttonColors.background,
        borderWidth: 2,
        borderColor: disabled
          ? buttonColors.disabledBorder
          : buttonColors?.border,
        ...style,
      })}
      onPress={async () => {
        await haptics.selection();
        if (!disabled) {
          onPress?.();
        }
      }}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
    >
      {icon && <View style={{ marginRight: children ? 8 : 0 }}>{icon}</View>}
      {isString(children) ? (
        <Text
          style={{
            fontSize: isSmall ? 15 : 17,
            color: disabled ? buttonColors.disabledText : buttonColors.text,
            fontWeight: "600",
          }}
          numberOfLines={1}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

export default Button;
