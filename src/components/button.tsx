import type { ViewStyle } from "react-native";

import { ButtonChildren, ButtonProvider } from "@/components/button-content";
import useColors from "@/hooks/use-colors";
import { PressableScale } from "@/components/pressable-scale";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";

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
 * from `@/components/button-content`, which take the button's color,
 * including the disabled color. `pixy-standards/button-label-children` blocks
 * a raw `Text` child.
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
  /**
   * `contrast`: black in light mode, white in dark mode. `glass`: secondary
   * button on the sky or a photo, see-through. iOS 26 liquid glass turns
   * opaque white on the light sky, so it is a plain see-through fill.
   */
  type?: "primary" | "secondary" | "contrast" | "danger" | "tertiary" | "glass";
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
    glass: {
      background: colors.onboardingControlBackground,
      text: colors.tertiaryButtonText,
      border: "transparent",
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
          padding: SPACE.lg,
          paddingRight: SPACE.lg,
          paddingLeft: SPACE.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: SPACE.sm,
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
