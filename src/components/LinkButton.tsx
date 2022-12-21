import _ from "lodash";
import {
  Pressable,
  StyleSheet,
  Text, TextStyle, View,
  ViewStyle
} from "react-native";
import * as FeatherIcons from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

const isString = (children: React.ReactNode): children is string => {
  if (_.isString(children)) {
    return true;
  }

  if (_.isArray(children)) {
    return children.every(d => _.isString(d));
  }

  return false;
};

export default function LinkButton({
  type = "primary",
  onPress,
  children,
  style = {},
  icon = null,
  testID,
  disabled,
}: {
  type?: "primary" | "secondary" | "danger";
  onPress: () => any;
  children?: React.ReactNode;
  style?: ViewStyle & TextStyle;
  icon?: keyof typeof FeatherIcons | null;
  testID?: string;
  disabled?: boolean;
}) {
  const colors = useColors();
  const haptics = useHaptics();

  const color = {
    primary: disabled
      ? colors.linkButtonTextPrimaryDisabled
      : colors.linkButtonTextPrimary,
    secondary: disabled
      ? colors.linkButtonTextSecondaryDisabled
      : colors.linkButtonTextSecondary,
    danger: disabled
      ? colors.linkButtonTextDangerDisabled
      : colors.linkButtonTextDanger,
  }[type];

  const Icon = FeatherIcons[icon as keyof typeof FeatherIcons];

  const _onPress = () => {
    if (!disabled) {
      haptics.selection();
      onPress();
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        ...style,
      }]}
      onPress={_onPress}
      testID={testID}
    >
      {icon && (
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
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  iconContainer: { marginRight: 5 },
});
