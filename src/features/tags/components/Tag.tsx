import { Pressable, Text, View, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { TAG_COLOR_NAMES } from "@/constants/Config";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/Radius";

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
  style?: ViewStyle;
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
        borderRadius: RADIUS.full,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingHorizontal: compact ? 10 : 16,
        paddingVertical: compact ? 4 : 8,
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
          width: compact ? 6 : 8,
          height: compact ? 6 : 8,
          borderRadius: RADIUS.sm,
          marginRight: compact ? 6 : 10,
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Text
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: compact ? 13 : 17,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

export default Tag;
