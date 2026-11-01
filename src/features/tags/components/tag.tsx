import { Pressable, View, useColorScheme } from "react-native";

import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import type { TAG_COLOR_NAMES } from "@/constants/config";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { COMPACT_CHIP } from "@/constants/chip";
import type { ChipStyle } from "@/constants/chip";
import { Label } from "@/components/typography";

const DEFAULT_STYLE = {};

const Tag = ({
  title,
  selected = false,
  colorName,
  onPress,
  onLongPress,
  compact = false,
  style = DEFAULT_STYLE,
}: {
  title: string;
  selected?: boolean;
  colorName: (typeof TAG_COLOR_NAMES)[number];
  onPress?: () => void;
  /** Opens the tag editor; also offered as the "edit" accessibility action. */
  onLongPress?: () => void;
  /** Small read-only pill for dense rows, like timeline cards. */
  compact?: boolean;
  style?: ChipStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: compact ? COMPACT_CHIP.gap : 10,
        borderRadius: RADIUS.full,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        ...(compact
          ? {
              height: COMPACT_CHIP.height,
              paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
            }
          : { paddingHorizontal: 16, paddingVertical: 8 }),
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
      <View
        style={{
          width: compact ? 7 : 8,
          height: compact ? 7 : 8,
          borderRadius: RADIUS.sm,
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Label
        size={compact ? 14 : 16}
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
        }}
      >
        {title}
      </Label>
    </Pressable>
  );
};

export default Tag;
