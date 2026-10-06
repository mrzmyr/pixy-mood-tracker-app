import React, { isValidElement, useCallback } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { AccessibilityValue, TextStyle, ViewStyle } from "react-native";

import { ChevronRight } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

const DEFAULT_STYLE = {};

/** Android: Material 3 list rows. Full width, 56dp, no dividers, no chevron. */
interface Metrics {
  frame: ViewStyle;
  row: ViewStyle;
  tallRow: ViewStyle;
  icon: ViewStyle;
  titleSize: number;
}

const ANDROID: Metrics = {
  frame: {},
  row: { minHeight: 56, paddingHorizontal: 16 },
  tallRow: { minHeight: 72, paddingHorizontal: 16 },
  icon: {
    width: 24,
    height: 24,
    marginRight: 16,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSize: 16,
};

const IOS: Metrics = {
  frame: {
    borderTopWidth: 1,
    marginRight: 16,
    marginLeft: 16,
  },
  row: { minHeight: 50 },
  tallRow: { minHeight: 50 },
  icon: { marginRight: 15, flexShrink: 0 },
  titleSize: 17,
};

const getRowStyle = (
  platform: Metrics,
  flexDirection: ViewStyle["flexDirection"]
) => (flexDirection === "column" ? platform.tallRow : platform.row);

const getRightIcon = ({
  showChevron,
  iconRight,
  color,
}: {
  showChevron: boolean;
  iconRight: React.ReactElement | null;
  color: string;
}) => (showChevron ? <ChevronRight width={18} color={color} /> : iconRight);

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
  const titleText = isValidElement(title) ? undefined : title;

  const isAndroid = Platform.OS === "android";
  const platform = isAndroid ? ANDROID : IOS;
  const rowStyle = getRowStyle(platform, style.flexDirection);

  const rightIcon = getRightIcon({
    showChevron: Boolean(isLink) && !isAndroid,
    iconRight,
    color: colors.menuListItemIcon,
  });

  const _onPress = useCallback(async () => {
    if (onPress !== null && !deactivated) {
      await haptics.selection();
      onPress();
    }
  }, [onPress, deactivated, haptics]);

  return (
    <View
      style={{
        ...platform.frame,
        borderTopColor: colors.menuListItemBorder,
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
            ...rowStyle,
            width: "100%",
            opacity: pressed && onPress ? 0.7 : 1,
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
            {iconLeft && <View style={platform.icon}>{iconLeft}</View>}
            {titleText === undefined ? (
              <View style={{ flex: 1, minWidth: 0 }}>{title}</View>
            ) : (
              <Text
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: platform.titleSize,
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
