import isString from "lodash/isString";
import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import { PressableScale } from "@/components/PressableScale";
import { RADIUS } from "@/constants/Radius";

const DEFAULT_STYLE = {};

const Button = ({
  type = "primary",
  icon,
  testID,
  accessibilityLabel,
  onPress,
  disabled = false,
  children,
  style = DEFAULT_STYLE,
}: {
  /** `contrast`: black in light mode, white in dark mode. */
  type?: "primary" | "secondary" | "contrast" | "danger" | "tertiary";
  icon?: React.ReactNode;
  testID?: string;
  /** Name for icon-only buttons. */
  accessibilityLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) => {
  const colors = useColors();

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
    contrast: {
      background: colors.contrastButtonBackground,
      text: colors.contrastButtonText,
      border: colors.contrastButtonBorder,
      disabledBackground: colors.contrastButtonBackgroundDisabled,
      disabledText: colors.contrastButtonTextDisabled,
      disabledBorder: colors.contrastButtonBorderDisabled,
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
    <PressableScale
      style={{
        padding: 16,
        paddingRight: 16,
        paddingLeft: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: icon ? 8 : 0,
        borderRadius: RADIUS.full,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: disabled
          ? buttonColors.disabledBackground
          : buttonColors.background,
        borderWidth: 2,
        borderColor: disabled
          ? buttonColors.disabledBorder
          : buttonColors?.border,
        ...style,
      }}
      onPress={() => {
        if (!disabled) {
          onPress?.();
        }
      }}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon && <View>{icon}</View>}
      {isString(children) ? (
        <Text
          style={{
            fontSize: 17,
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
    </PressableScale>
  );
};

export default Button;
