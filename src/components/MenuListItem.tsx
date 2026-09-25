import React, { isValidElement, useCallback } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

const MenuListItem = ({
  title,
  onPress = null,
  iconLeft = null,
  iconRight = null,
  isLast = false,
  isLink = false,
  deactivated = false,
  style = {},
  children,
  testID,
}: {
  title?: string | React.ReactElement;
  onPress?: (() => void) | null;
  iconLeft?: React.ReactElement | null;
  iconRight?: React.ReactElement | null;
  children?: React.ReactNode;
  isLast?: boolean | null;
  isLink?: boolean | null;
  deactivated?: boolean;
  style?: ViewStyle & TextStyle;
  testID?: string;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const titleText = isValidElement(title) ? undefined : title;

  iconRight = iconRight || null;

  if (isLink) {
    iconRight = <ChevronRight width={18} color={colors.menuListItemIcon} />;
  }

  const _onPress = useCallback(async () => {
    if (onPress !== null && !deactivated) {
      await haptics.selection();
      onPress();
    }
  }, [onPress, deactivated, haptics]);

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.menuListItemBorder,
        marginRight: 16,
        marginLeft: 16,
        opacity: deactivated ? 0.5 : 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={onPress ? _onPress : undefined}
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
            opacity: pressed && onPress ? 0.7 : 1,
            ...style,
          },
        ]}
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
        {iconRight && (
          <View
            style={{
              flexShrink: 0,
              marginLeft: 12,
              justifyContent: "center",
              alignItems: "flex-end",
            }}
          >
            {iconRight}
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default MenuListItem;
