import { Pressable, Text, View, useColorScheme } from "react-native";
import type { PressableProps } from "react-native";

import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import type { TAG_COLOR_NAMES } from "@/constants/config";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { CHIP, COMPACT_CHIP } from "@/constants/chip";
import type { ChipStyle } from "@/constants/chip";
import { Chip } from "@/components/chip";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Tag as TagType } from "../tags-provider";
import { TagIcon } from "./tag-icon";

const DEFAULT_STYLE = {};
/** Same as the compact emotion icon, so mixed chip rows line up. */
const COMPACT_ICON_SIZE = 16;

const Tag = ({
  title,
  selected = false,
  colorName,
  icon,
  onPress,
  onLongPress,
  compact = false,
  style = DEFAULT_STYLE,
  accessibilityActions,
  onAccessibilityAction,
  testID,
}: Pick<
  PressableProps,
  "accessibilityActions" | "onAccessibilityAction" | "testID"
> & {
  title: string;
  selected?: boolean;
  colorName: (typeof TAG_COLOR_NAMES)[number];
  /**
   * Drawn instead of the color dot while flag `tag-icons` is on. Missing
   * `icon` draws the default.
   */
  icon?: TagType["icon"];
  onPress?: () => void;
  /**
   * Opens the tag editor; also offered as the "edit" accessibility action.
   * `accessibilityActions` replace that action, for chips whose hold drags.
   */
  onLongPress?: () => void;
  /** Small read-only pill for dense rows, like timeline cards. */
  compact?: boolean;
  style?: ChipStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const showIcon = useFeatureFlag("tag-icons");

  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  if (!compact) {
    return (
      <Chip
        label={title}
        selected={selected}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
        testID={testID}
        lead={
          showIcon ? (
            <TagIcon icon={icon} color={colorName} size={CHIP.lead} />
          ) : (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: RADIUS.full,
                backgroundColor: colors.tags[colorName]?.dot,
              }}
            />
          )
        }
        leadSelected={
          showIcon ? (
            <TagIcon
              icon={icon}
              color={colorName}
              size={CHIP.lead}
              surface={colorScheme === "light" ? "dark" : "light"}
            />
          ) : undefined
        }
        style={style}
      />
    );
  }
  return (
    <Pressable
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: COMPACT_CHIP.gap,
        borderRadius: RADIUS.full,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        height: COMPACT_CHIP.height,
        paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
      onPress={async () => {
        if (!onPress) {
          return;
        }
        await haptics.selection();
        onPress?.();
      }}
      onLongPress={
        onLongPress
          ? async () => {
              await haptics.impact();
              onLongPress();
            }
          : undefined
      }
      accessibilityRole={onPress ? "checkbox" : undefined}
      accessibilityState={onPress ? { checked: selected } : undefined}
      accessibilityActions={
        onLongPress ? [{ name: "edit", label: t("edit") }] : undefined
      }
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "edit") {
          onLongPress?.();
        }
      }}
    >
      {showIcon ? (
        <TagIcon icon={icon} color={colorName} size={COMPACT_ICON_SIZE} />
      ) : (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: RADIUS.sm,
            backgroundColor: colors.tags[colorName]?.dot,
          }}
        />
      )}
      <Text
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: COMPACT_CHIP.fontSize,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

export default Tag;
