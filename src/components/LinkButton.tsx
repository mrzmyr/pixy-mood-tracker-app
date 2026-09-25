import isArray from "lodash/isArray";
import isStringValue from "lodash/isString";
import type { TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SvgProps } from "react-native-svg";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

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
  return isPressed ? 0.8 : 1;
};

const LinkButton = ({
  type = "primary",
  onPress,
  children,
  style = DEFAULT_STYLE,
  icon: Icon = null,
  testID,
  disabled,
}: {
  type?: "primary" | "secondary";
  onPress: () => void;
  children?: React.ReactNode;
  style?: ViewStyle & TextStyle;
  icon?: ((props: SvgProps) => React.JSX.Element) | null;
  testID?: string;
  disabled?: boolean;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

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
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          opacity: getPressableOpacity(disabled, pressed),
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
