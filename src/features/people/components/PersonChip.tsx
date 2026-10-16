import { Check } from "lucide-react-native";
import { Pressable, Text, View, useColorScheme } from "react-native";
import type { ReactElement } from "react";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { ItemMenu, useItemMenuPressProps } from "@/components/ItemMenu";
import type { ItemMenuActions } from "@/components/ItemMenu";
import type { Person } from "../PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";
import { RADIUS } from "@/constants/Radius";
import { COMPACT_CHIP } from "@/constants/Chip";
import { BEZEL } from "@/constants/Bezel";
import { TILE_RING_GAP, TILE_RING_WIDTH } from "../tile";

const DEFAULT_STYLE = {};
const CHIP_SPACING = { marginRight: 8, marginBottom: 8 };
/** Selected shell border. Padding shrinks by the same amount, so size holds. */
const TILE_SELECTED_RING_WIDTH = 2;
/** Measurements of the `chip` variant, regular and compact. */
const CHIP_SIZES = {
  regular: {
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 6,
    avatar: 24,
    gap: 8,
    fontSize: 17,
  },
  compact: {
    paddingLeft: COMPACT_CHIP.paddingLeftAvatar,
    paddingRight: COMPACT_CHIP.paddingHorizontal,
    paddingVertical: 0,
    height: COMPACT_CHIP.height,
    avatar: COMPACT_CHIP.avatarSize,
    gap: COMPACT_CHIP.gap,
    fontSize: COMPACT_CHIP.fontSize,
  },
};

type MenuPressProps = ReturnType<typeof useItemMenuPressProps>;

/** `tile` variant of {@link PersonChip}; `onPress` already plays haptics. */
const PersonTile = ({
  person,
  selected,
  onPress,
  menuPressProps,
  style,
  testID,
  size,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected: boolean;
  onPress?: () => void;
  menuPressProps: MenuPressProps;
  style: ViewStyle;
  testID?: string;
  size: number;
}) => {
  const colors = useColors();
  const outer = size + 2 * (TILE_RING_GAP + TILE_RING_WIDTH);
  const ringWidth = selected ? TILE_SELECTED_RING_WIDTH : TILE_RING_WIDTH;

  return (
    <Pressable
      onPress={onPress}
      {...menuPressProps}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={person.name}
      testID={testID}
      style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
    >
      {/* Bezel shell: hairline border and shadow, gap, then the avatar with
          its inner border. Both are circles, so they stay concentric. */}
      <View
        style={{
          width: outer,
          height: outer,
          padding: BEZEL.gap + TILE_RING_WIDTH - ringWidth,
          borderRadius: outer / 2,
          borderWidth: ringWidth,
          borderColor: selected ? colors.tint : colors.bezelBorder,
          backgroundColor: colors.bezelBackground,
          boxShadow: colors.bezelShadow,
        }}
      >
        <View
          style={{
            borderRadius: RADIUS.full,
            borderWidth: BEZEL.borderWidth,
            borderColor: colors.bezelInnerBorder,
            overflow: "hidden",
          }}
        >
          <PersonAvatar person={person} size={size} />
        </View>
      </View>
      {selected && (
        <View
          style={{
            position: "absolute",
            top: outer - 28,
            right: 0,
            width: 28,
            height: 28,
            borderRadius: RADIUS.full,
            backgroundColor: colors.primaryButtonBackground,
            borderWidth: 2,
            borderColor: colors.logBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={16} color={colors.primaryButtonText} strokeWidth={3} />
        </View>
      )}
      <Text
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: outer,
          fontSize: 15,
          fontWeight: selected ? "600" : "400",
          color: colors.text,
        }}
      >
        {person.name}
      </Text>
    </Pressable>
  );
};

/**
 * Chip for one person, shared by the logger slide, entry cards, filters,
 * and statistics so a person looks the same everywhere.
 *
 * - `chip`: avatar plus name, like a tag pill
 * - `large`: big avatar with the name below, for the person screen
 * - `tile`: grid cell for the logger slide; avatar sits in a bezel.
 *   Selection tints the shell border and adds a check badge, so it reads
 *   without relying on color alone
 *
 * `menu` adds the long-press menu (edit, archive, delete) to `chip` and
 * `tile`; screen readers get its items as actions.
 */
export const PersonChip = ({
  person,
  selected = false,
  variant = "chip",
  onPress,
  menu,
  style = DEFAULT_STYLE,
  testID,
  previewUri = null,
  size = 88,
  compact = false,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected?: boolean;
  variant?: "chip" | "large" | "tile";
  onPress?: () => void;
  /** Long-press menu of `chip` and `tile`: edit, archive, delete. */
  menu?: ItemMenuActions;
  style?: ViewStyle;
  testID?: string;
  /** Picked image not stored yet; only the `large` variant shows it. */
  previewUri?: string | null;
  /** Avatar diameter of the `tile` variant. */
  size?: number;
  /** Small `chip` for dense rows, like timeline cards. */
  compact?: boolean;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const chipSize = CHIP_SIZES[compact ? "compact" : "regular"];

  const press = async () => {
    if (!onPress) {
      return;
    }
    await haptics.selection();
    onPress();
  };

  const menuPressProps = useItemMenuPressProps(menu);
  const withMenu = (item: ReactElement, spacing?: ViewStyle) =>
    menu ? (
      <ItemMenu menu={menu} style={spacing}>
        {item}
      </ItemMenu>
    ) : (
      item
    );

  if (variant === "large") {
    return (
      <Pressable
        onPress={onPress ? press : undefined}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={person.name}
        testID={testID}
        style={({ pressed }) => ({
          alignItems: "center",
          opacity: pressed && onPress ? 0.8 : 1,
          ...style,
        })}
      >
        <PersonAvatar person={person} size={96} previewUri={previewUri} />
        <Text
          numberOfLines={1}
          style={{
            marginTop: 12,
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
          }}
        >
          {person.name}
        </Text>
      </Pressable>
    );
  }

  if (variant === "tile") {
    return withMenu(
      <PersonTile
        person={person}
        selected={selected}
        onPress={onPress ? press : undefined}
        menuPressProps={menuPressProps}
        style={style}
        testID={testID}
        size={size}
      />
    );
  }

  return withMenu(
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={person.name}
      testID={testID}
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        borderRadius: RADIUS.full,
        ...(menu ? undefined : CHIP_SPACING),
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingLeft: chipSize.paddingLeft,
        paddingRight: chipSize.paddingRight,
        paddingVertical: chipSize.paddingVertical,
        height: "height" in chipSize ? chipSize.height : undefined,
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
      onPress={onPress ? press : undefined}
      {...menuPressProps}
    >
      <PersonAvatar person={person} size={chipSize.avatar} />
      <Text
        numberOfLines={1}
        style={{
          marginLeft: chipSize.gap,
          flexShrink: 1,
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: chipSize.fontSize,
        }}
      >
        {person.name}
      </Text>
    </Pressable>,
    CHIP_SPACING
  );
};
