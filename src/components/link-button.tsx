import { Platform, Pressable } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

import { ButtonChildren, ButtonProvider } from "@/components/button-content";
import useColors from "@/hooks/use-colors";
import usePressRipple from "@/hooks/use-press-ripple";

const DEFAULT_STYLE = {};

const getPressableOpacity = (
  isDisabled: boolean | undefined,
  isPressed: boolean
) => {
  if (isDisabled) {
    return 0.5;
  }
  // Android shows a ripple instead of the fade.
  return isPressed && Platform.OS !== "android" ? 0.8 : 1;
};

/**
 * Text button. Children: a label string, or `ButtonIcon` and `ButtonText`
 * from `@/components/button-content`, which take the button's color,
 * including the disabled color. `pixy-standards/button-label-children` blocks
 * a raw `Text` child.
 * `style.color` and `style.fontWeight` restyle the label.
 */
const LinkButton = ({
  type = "primary",
  onPress,
  children,
  style = DEFAULT_STYLE,
  testID,
  disabled,
  accessibilityLabel,
  hitSlop,
}: {
  type?: "primary" | "secondary";
  onPress: () => void;
  children?: React.ReactNode;
  style?: ViewStyle & TextStyle;
  testID?: string;
  disabled?: boolean;
  /** Name for icon-only buttons. */
  accessibilityLabel?: string;
  /** Extra touch area around a small button. */
  hitSlop?: number;
}) => {
  const colors = useColors();
  const isIconOnly = !children;
  const ripple = usePressRipple(
    isIconOnly ? { borderless: true, radius: 24 } : { foreground: true }
  );

  const color = {
    primary: disabled
      ? colors.linkButtonTextPrimaryDisabled
      : colors.linkButtonTextPrimary,
    secondary: disabled
      ? colors.linkButtonTextSecondaryDisabled
      : colors.linkButtonTextSecondary,
  }[type];

  const _onPress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <ButtonProvider
      value={{
        color: style.color || color,
        disabled: Boolean(disabled),
        textStyle: {
          textAlign: "center",
          fontWeight: style.fontWeight || "500",
        },
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: Boolean(disabled) }}
        hitSlop={hitSlop}
        android_ripple={ripple}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: 8,
            opacity: getPressableOpacity(disabled, pressed),
            overflow:
              Platform.OS === "android" && !isIconOnly ? "hidden" : "visible",
            ...style,
          },
        ]}
        onPress={_onPress}
        testID={testID}
      >
        <ButtonChildren>{children}</ButtonChildren>
      </Pressable>
    </ButtonProvider>
  );
};

export default LinkButton;
