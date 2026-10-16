import { Pressable, Text, View, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { TAG_COLOR_NAMES } from "@/constants/Config";
import { ItemMenu, useItemMenuPressProps } from "@/components/ItemMenu";
import type { ItemMenuActions } from "@/components/ItemMenu";
import { RADIUS } from "@/constants/Radius";
import { COMPACT_CHIP } from "@/constants/Chip";

const DEFAULT_STYLE = {};
const SPACING = { marginRight: 8, marginBottom: 8 };

const Tag = ({
  title,
  selected = false,
  colorName,
  onPress,
  menu,
  compact = false,
  style = DEFAULT_STYLE,
}: {
  title: string;
  selected?: boolean;
  colorName: (typeof TAG_COLOR_NAMES)[number];
  onPress?: () => void;
  /** Long-press menu: edit, archive, delete. Also offered as accessibility actions. */
  menu?: ItemMenuActions;
  /** Small read-only pill for dense rows, like timeline cards. */
  compact?: boolean;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const menuPressProps = useItemMenuPressProps(menu);
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const chip = (
    <Pressable
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        borderRadius: RADIUS.full,
        ...(menu ? undefined : SPACING),
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
      {...menuPressProps}
    >
      <View
        style={{
          width: compact ? 7 : 8,
          height: compact ? 7 : 8,
          borderRadius: RADIUS.sm,
          marginRight: compact ? COMPACT_CHIP.gap : 10,
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Text
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: compact ? COMPACT_CHIP.fontSize : 17,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );

  if (!menu) {
    return chip;
  }

  return (
    <ItemMenu menu={menu} style={SPACING}>
      {chip}
    </ItemMenu>
  );
};

export default Tag;
