import React, { isValidElement, useCallback } from "react";
import { Platform, Pressable, View } from "react-native";
import type { AccessibilityValue, ViewStyle } from "react-native";

import ChevronRight from "lucide-react-native/icons/chevron-right";
import { SFIcon } from "@/components/sf-icon";
import { Label } from "@/components/typography";
import type { LabelSize } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import usePressRipple from "@/hooks/use-press-ripple";

const DEFAULT_STYLE = {};

/** Android: Material 3 list rows. Full width, 56dp, no dividers, no chevron. */
interface Metrics {
  frame: ViewStyle;
  row: ViewStyle;
  tallRow: ViewStyle;
  icon: ViewStyle;
  /** Space between the left icon and the title. */
  iconGap: number;
  titleSize: LabelSize;
}

const ANDROID: Metrics = {
  frame: {},
  row: { minHeight: 56, paddingHorizontal: 16 },
  tallRow: { minHeight: 72, paddingHorizontal: 16 },
  icon: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGap: 16,
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
  icon: { flexShrink: 0 },
  iconGap: 15,
  titleSize: 16,
};

const getRowStyle = (
  platform: Metrics,
  flexDirection: ViewStyle["flexDirection"]
) => (flexDirection === "column" ? platform.tallRow : platform.row);

/** Android shows a ripple instead of the fade. */
const getPressedOpacity = ({
  pressed,
  hasPress,
  isAndroid,
}: {
  pressed: boolean;
  hasPress: boolean;
  isAndroid: boolean;
}) => (pressed && hasPress && !isAndroid ? 0.7 : 1);

const getRightIcon = ({
  showChevron,
  iconRight,
  color,
}: {
  showChevron: boolean;
  iconRight: React.ReactElement | null;
  color: string;
}) =>
  showChevron ? (
    // Same chevron as native Settings rows (`FieldRow`).
    <SFIcon
      name="chevron.right"
      size={13}
      color={color}
      fallback={<ChevronRight width={18} color={color} />}
    />
  ) : (
    iconRight
  );

const getAccessibilityRole = (hasPress: boolean, checked?: boolean) => {
  if (checked !== undefined) {
    return "radio";
  }
  return hasPress ? "button" : undefined;
};

// One state per platform, else screen readers announce it twice: iOS
// selection lists use the selected trait, Android radio buttons use checked.
const getAccessibilityState = (isAndroid: boolean, checked?: boolean) => {
  if (checked === undefined) {
    return;
  }
  return isAndroid ? { checked } : { selected: checked };
};

/**
 * Role of a row. `destructive` removes or resets: danger color, centered with
 * no icon on iOS (native delete row), left with its icon on Android. `action`
 * starts something instead of opening or toggling: tint color.
 */
export type MenuListItemTone = "default" | "destructive" | "action";

const getToneStyle = ({
  tone,
  colors,
  isAndroid,
  iconLeft,
}: {
  tone: MenuListItemTone;
  colors: ReturnType<typeof useColors>;
  isAndroid: boolean;
  iconLeft: React.ReactElement | null;
}) => {
  // iOS delete rows are centered and show no icon.
  const isCentered = tone === "destructive" && !isAndroid;
  return {
    color: {
      default: colors.menuListItemText,
      destructive: colors.danger,
      action: colors.tint,
    }[tone],
    isCentered,
    leftIcon: isCentered ? null : iconLeft,
  };
};

const getFrameStyle = ({
  frame,
  borderTopColor,
  deactivated,
}: {
  frame: ViewStyle;
  borderTopColor: string;
  deactivated?: boolean;
}): ViewStyle => ({
  ...frame,
  borderTopColor,
  opacity: deactivated ? 0.5 : 1,
  justifyContent: "center",
  alignItems: "center",
});

/**
 * Row of a menu list. Title: short Title Case noun, ending in `…` when the
 * row opens a follow-up step. Status: `children`, in the
 * value slot. Role: `tone`. Text never wraps or shrinks: shorten it instead.
 * Warnings about the list go below it as `TextInfo`.
 */
const MenuListItem = ({
  title,
  onPress = null,
  iconLeft = null,
  iconRight = null,
  isLink,
  tone = "default",
  deactivated,
  style = DEFAULT_STYLE,
  children,
  testID,
  accessibilityValue,
  checked,
  dividerColor,
}: {
  title?: string | React.ReactElement;
  onPress?: (() => void) | null;
  iconLeft?: React.ReactElement | null;
  iconRight?: React.ReactElement | null;
  children?: React.ReactNode;
  isLink?: boolean | null;
  tone?: MenuListItemTone;
  deactivated?: boolean;
  /** Row layout only. `tone` sets the text color. */
  style?: ViewStyle;
  testID?: string;
  /** Current value, read after the title, for example a selected option. */
  accessibilityValue?: AccessibilityValue;
  /** Makes the row a radio button with this checked state. */
  checked?: boolean;
  /** iOS divider color for lists on other backgrounds, e.g. logger cards. */
  dividerColor?: string;
}) => {
  const colors = useColors();
  const ripple = usePressRipple({ foreground: true });
  const titleText = isValidElement(title) ? undefined : title;

  const isAndroid = Platform.OS === "android";
  const platform = isAndroid ? ANDROID : IOS;
  const rowStyle = getRowStyle(platform, style.flexDirection);
  const {
    color: titleColor,
    isCentered,
    leftIcon,
  } = getToneStyle({ tone, colors, isAndroid, iconLeft });

  const rightIcon = getRightIcon({
    showChevron: Boolean(isLink) && !isAndroid,
    iconRight,
    color: colors.menuListItemIcon,
  });

  const _onPress = useCallback(() => {
    if (onPress !== null && !deactivated) {
      onPress();
    }
  }, [onPress, deactivated]);

  return (
    <View
      style={getFrameStyle({
        frame: platform.frame,
        borderTopColor: dividerColor ?? colors.menuListItemBorder,
        deactivated,
      })}
    >
      <Pressable
        onPress={onPress ? _onPress : undefined}
        android_ripple={onPress ? ripple : undefined}
        accessible={Boolean(onPress)}
        accessibilityRole={getAccessibilityRole(Boolean(onPress), checked)}
        accessibilityState={getAccessibilityState(isAndroid, checked)}
        accessibilityLabel={onPress ? titleText : undefined}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 8,
            ...rowStyle,
            width: "100%",
            opacity: getPressedOpacity({
              pressed,
              hasPress: Boolean(onPress),
              isAndroid,
            }),
            ...style,
          },
        ]}
        accessibilityValue={accessibilityValue}
        testID={testID}
      >
        {(leftIcon || title) && (
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: platform.iconGap,
            }}
          >
            {leftIcon && <View style={platform.icon}>{leftIcon}</View>}
            {titleText === undefined ? (
              <View style={{ flex: 1, minWidth: 0 }}>{title}</View>
            ) : (
              <Label
                size={platform.titleSize}
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: titleColor,
                  textAlign: isCentered ? "center" : undefined,
                }}
                numberOfLines={1}
              >
                {titleText}
              </Label>
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
