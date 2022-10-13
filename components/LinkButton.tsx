import { useCallback } from "react";
import {
  StyleSheet,
  Text, TouchableOpacityProps,
  View
} from "react-native";
import * as FeatherIcons from "react-native-feather";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useStyle } from "react-native-style-utilities";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";

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
  style?: TouchableOpacityProps["style"];
  icon?: keyof typeof FeatherIcons;
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

  const containerStyle = useStyle(() => [styles.container, style], [style]);
  const textStyle = useStyle(() => [styles.text, { color }], [color]);

  const _onPress = useCallback(async () => {
    if (!disabled) {
      await haptics.selection();
      onPress();
    }
  }, [disabled, haptics, onPress]);

  
  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={_onPress}
      testID={testID}
      activeOpacity={disabled ? 1 : 0.8}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Icon width={17} color={color} />
        </View>
      )}
      {children && (
        <Text ellipsizeMode="tail" numberOfLines={1} style={textStyle}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
  },
  text: {
    fontSize: 17,
    textAlign: "center",
  },
  iconContainer: { marginRight: 5 },
});
