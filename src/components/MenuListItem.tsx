import React, { isValidElement, useCallback } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { AccessibilityValue, TextStyle, ViewStyle } from "react-native";

import { ChevronRight } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import usePressRipple from "@/hooks/usePressRipple";

const DEFAULT_STYLE = {};

const MenuListItem = ({
  title,
  onPress = null,
  iconLeft = null,
  iconRight = null,
  isLink,
  deactivated,
  style = DEFAULT_STYLE,
  children,
  testID,
  accessibilityValue,
}: {
  title?: string | React.ReactElement;
  onPress?: (() => void) | null;
  iconLeft?: React.ReactElement | null;
  iconRight?: React.ReactElement | null;
  children?: React.ReactNode;
  isLink?: boolean | null;
  deactivated?: boolean;
  style?: ViewStyle & TextStyle;
  testID?: string;
  /** Current value, read after the title, for example a selected option. */
  accessibilityValue?: AccessibilityValue;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const ripple = usePressRipple({ foreground: true });
  const titleText = isValidElement(title) ? undefined : title;

  const rightIcon = isLink ? (
    <ChevronRight width={18} color={colors.menuListItemIcon} />
  ) : (
    iconRight
  );

  const _onPress = useCallback(async () => {
    if (onPress !== null && !deactivated) {
      await haptics.selection();
      onPress();
    }
  }, [onPress, deactivated, haptics]);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.menuListItemBorder,
        marginRight: 16,
        marginLeft: 16,
        opacity: deactivated ? 0.5 : 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={onPress ? _onPress : undefined}
        android_ripple={onPress ? ripple : undefined}
        accessible={Boolean(onPress)}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={
          onPress && titleText !== undefined ? titleText : undefined
        }
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 8,
            minHeight: 50,
            width: "100%",
            // Android shows a ripple instead of the fade.
            opacity: pressed && onPress && Platform.OS !== "android" ? 0.7 : 1,
            ...style,
          },
        ]}
        accessibilityValue={accessibilityValue}
        testID={testID}
      >
        {(iconLeft || title) && (
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {iconLeft && (
              <View style={{ marginRight: 15, flexShrink: 0 }}>{iconLeft}</View>
            )}
            {titleText === undefined ? (
              <View style={{ flex: 1, minWidth: 0 }}>{title}</View>
            ) : (
              <Text
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 17,
                  color: style.color || colors.menuListItemText,
                }}
                numberOfLines={1}
              >
                {titleText}
              </Text>
            )}
          </View>
        )}
        {children && (
          <View
            style={{
              flex: 1,
              minWidth: 0,
              justifyContent: "center",
            }}
          >
            {children}
          </View>
        )}
        {rightIcon && (
          <View
            style={{
              flexShrink: 0,
              marginLeft: 12,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          >
            {rightIcon}
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default MenuListItem;
