import isArray from "lodash/isArray";
import isStringValue from "lodash/isString";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

import type { SvgProps } from "react-native-svg";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import usePressRipple from "@/hooks/usePressRipple";

const DEFAULT_STYLE = {};

const isString = (children: React.ReactNode): children is string => {
  if (isStringValue(children)) {
    return true;
  }

  if (isArray(children)) {
    return children.every((d) => isStringValue(d));
  }

  return false;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  iconContainer: { marginRight: 5 },
});

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

const LinkButton = ({
  type = "primary",
  onPress,
  children,
  style = DEFAULT_STYLE,
  icon: Icon = null,
  testID,
  disabled,
  accessibilityLabel,
  hitSlop,
}: {
  type?: "primary" | "secondary";
  onPress: () => void;
  children?: React.ReactNode;
  style?: ViewStyle & TextStyle;
  icon?: ((props: SvgProps) => React.JSX.Element) | null;
  testID?: string;
  disabled?: boolean;
  /** Name for icon-only buttons. */
  accessibilityLabel?: string;
  /** Extra touch area around a small button. */
  hitSlop?: number;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
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
      haptics.selection();
      onPress();
    }
  };

  return (
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
      {Icon && (
        <View style={styles.iconContainer}>
          <Icon width={17} color={color} />
        </View>
      )}
      {isString(children) ? (
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{
            fontSize: 17,
            textAlign: "center",
            color: style.color || color,
            fontWeight: style.fontWeight || "500",
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

export default LinkButton;
