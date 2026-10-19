import type { ViewStyle } from "react-native";

import { ButtonChildren, ButtonProvider } from "@/components/button-content";
import useColors from "@/hooks/use-colors";
import { PressableScale } from "@/components/pressable-scale";
import { RADIUS } from "@/constants/radius";

const DEFAULT_STYLE = {};
const TEXT_STYLE = { fontWeight: "600" } as const;

interface Palette {
  background: string;
  text: string;
  border: string;
  disabledBackground?: string;
  disabledText?: string;
  disabledBorder?: string;
}

/**
 * Filled button. Children: a label string, or `ButtonIcon` and `ButtonText`
 * from `@/components/button-content`, which take the button's color.
 */
const Button = ({
  type = "primary",
  testID,
  accessibilityLabel,
  onPress,
  disabled = false,
  children,
  style = DEFAULT_STYLE,
}: {
  /** `contrast`: black in light mode, white in dark mode. */
  type?: "primary" | "secondary" | "contrast" | "danger" | "tertiary";
  testID?: string;
  /** Name for icon-only buttons. */
  accessibilityLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) => {
  const colors = useColors();

  const buttonColors: Palette = {
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

  const textColor = disabled
    ? (buttonColors.disabledText ?? buttonColors.text)
    : buttonColors.text;

  return (
    <ButtonProvider
      value={{ color: textColor, disabled, textStyle: TEXT_STYLE }}
    >
      <PressableScale
        style={{
          padding: 16,
          paddingRight: 16,
          paddingLeft: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
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
        <ButtonChildren>{children}</ButtonChildren>
      </PressableScale>
    </ButtonProvider>
  );
};

export default Button;
