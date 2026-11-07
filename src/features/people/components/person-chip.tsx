import { Pressable, Text, View, useColorScheme } from "react-native";
import type { PressableProps, ViewStyle } from "react-native";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { Person } from "../people-provider";
import { PersonAvatar } from "./person-avatar";
import { RADIUS } from "@/constants/radius";
import { COMPACT_CHIP } from "@/constants/chip";
import type { ChipStyle } from "@/constants/chip";
import { Chip } from "@/components/chip";
import { TILE_RING_GAP, TILE_RING_WIDTH } from "../tile";

const DEFAULT_STYLE = {};
/** Avatar in the regular chip: 8 pt from the pill edge on every side. */
const CHIP_AVATAR = 26;
/** Measurements of the compact `chip` variant. */
const COMPACT_SIZE = {
  paddingLeft: COMPACT_CHIP.paddingLeftAvatar,
  paddingRight: COMPACT_CHIP.paddingHorizontal,
  paddingVertical: 0,
  height: COMPACT_CHIP.height,
  avatar: COMPACT_CHIP.avatarSize,
  gap: COMPACT_CHIP.gap,
  fontSize: COMPACT_CHIP.fontSize,
  lineHeight: COMPACT_CHIP.lineHeight,
};

type LongPressProps = Pick<
  PressableProps,
  "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
>;

/**
 * Long press and the screen reader "edit" action, both running `onLongPress`.
 * Without `editOnLongPress` only the screen reader action stays. `onMove`
 * adds Move Up and Move Down for screen readers, the drag stand-in.
 */
const getLongPressProps = ({
  onLongPress,
  editOnLongPress,
  onMove,
  playHaptics,
}: {
  onLongPress?: () => void;
  editOnLongPress: boolean;
  onMove?: (offset: -1 | 1) => void;
  playHaptics: () => Promise<void>;
}): LongPressProps => {
  if (!onLongPress && !onMove) {
    return {};
  }
  return {
    onLongPress:
      onLongPress && editOnLongPress
        ? async () => {
            await playHaptics();
            onLongPress();
          }
        : undefined,
    accessibilityActions: [
      ...(onLongPress ? [{ name: "edit", label: t("edit") }] : []),
      ...(onMove
        ? [
            { name: "moveUp", label: t("tags_move_up") },
            { name: "moveDown", label: t("tags_move_down") },
          ]
        : []),
    ],
    onAccessibilityAction: ({ nativeEvent }) => {
      if (nativeEvent.actionName === "edit") {
        onLongPress?.();
      }
      if (nativeEvent.actionName === "moveUp") {
        onMove?.(-1);
      }
      if (nativeEvent.actionName === "moveDown") {
        onMove?.(1);
      }
    },
  };
};

/**
 * Regular `chip` variant of {@link PersonChip}. The chip plays its own
 * haptics, so it gets the raw handlers; screen reader actions come from
 * `longPressProps`.
 */
const RegularPersonChip = ({
  person,
  selected,
  onPress,
  onLongPress,
  longPressProps: { onLongPress: _withHaptics, ...a11yActions },
  testID,
  style,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  longPressProps: LongPressProps;
  testID?: string;
  style: ChipStyle;
}) => (
  <Chip
    label={person.name}
    selected={selected}
    onPress={onPress}
    onLongPress={onLongPress}
    {...a11yActions}
    testID={testID}
    lead={<PersonAvatar person={person} size={CHIP_AVATAR} />}
    leadSize={CHIP_AVATAR}
    style={style}
  />
);

/** `tile` variant of {@link PersonChip}; `onPress` already plays haptics. */
const PersonTile = ({
  person,
  selected,
  onPress,
  longPressProps,
  style,
  testID,
  size,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected: boolean;
  onPress?: () => void;
  longPressProps: LongPressProps;
  style: ViewStyle;
  testID?: string;
  size: number;
}) => {
  const colors = useColors();
  const outer = size + 2 * (TILE_RING_GAP + TILE_RING_WIDTH);

  return (
    <Pressable
      onPress={onPress}
      {...longPressProps}
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
      {/* Ring only: no shell, no badge. Selected tints the ring and bolds
          the name, so selection does not rely on color alone. */}
      <View
        style={{
          width: outer,
          height: outer,
          padding: TILE_RING_GAP,
          borderRadius: outer / 2,
          borderWidth: TILE_RING_WIDTH,
          borderColor: selected ? colors.tint : "transparent",
        }}
      >
        <PersonAvatar person={person} size={size} />
        {/* Hairline edge: in dark mode the fallback avatar matches the
            slide background and would vanish without it. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: TILE_RING_GAP,
            left: TILE_RING_GAP,
            width: size,
            height: size,
            borderRadius: RADIUS.full,
            borderWidth: 1,
            borderColor: colors.bezelInnerBorder,
          }}
        />
      </View>
      <Label
        size={14}
        strong={selected}
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: outer,
          color: colors.text,
        }}
      >
        {person.name}
      </Label>
    </Pressable>
  );
};

/**
 * Chip for one person, shared by the logger slide, entry cards, filters,
 * and statistics so a person looks the same everywhere.
 *
 * - `chip`: avatar plus name, like a tag pill
 * - `large`: big avatar with the name below, for the person screen
 * - `tile`: grid cell for the logger slide; bare avatar. Selection adds a
 *   tint ring and a bold name, so it reads without relying on color alone
 *
 * `onLongPress` opens the person editor in `chip` and `tile`; screen readers
 * get it as the "edit" action. `editOnLongPress={false}` keeps only the
 * screen reader action, for tiles whose long press opens a context menu.
 * `onMove` gives screen readers Move Up and Move Down.
 */
export const PersonChip = ({
  person,
  selected = false,
  variant = "chip",
  onPress,
  onLongPress,
  editOnLongPress = true,
  onMove,
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
  onLongPress?: () => void;
  editOnLongPress?: boolean;
  onMove?: (offset: -1 | 1) => void;
  style?: ChipStyle;
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
  const chipSize = COMPACT_SIZE;

  const press = async () => {
    if (!onPress) {
      return;
    }
    await haptics.selection();
    onPress();
  };

  const longPressProps = getLongPressProps({
    onLongPress,
    editOnLongPress,
    onMove,
    playHaptics: haptics.impact,
  });

  if (variant === "large") {
    return (
      <Pressable
        onPress={onPress ? press : undefined}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={person.name}
        testID={testID}
        style={({ pressed }) => ({
          alignItems: "center",
          gap: 12,
          opacity: pressed && onPress ? 0.8 : 1,
          ...style,
        })}
      >
        <PersonAvatar person={person} size={96} previewUri={previewUri} />
        <Text
          numberOfLines={1}
          style={{
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
    return (
      <PersonTile
        person={person}
        selected={selected}
        onPress={onPress ? press : undefined}
        longPressProps={longPressProps}
        style={style}
        testID={testID}
        size={size}
      />
    );
  }

  if (!compact) {
    return (
      <RegularPersonChip
        person={person}
        selected={selected}
        onPress={onPress}
        onLongPress={editOnLongPress ? onLongPress : undefined}
        longPressProps={longPressProps}
        testID={testID}
        style={style}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={person.name}
      testID={testID}
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: chipSize.gap,
        borderRadius: RADIUS.full,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingLeft: chipSize.paddingLeft,
        paddingRight: chipSize.paddingRight,
        paddingVertical: chipSize.paddingVertical,
        height: chipSize.height,
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
      onPress={onPress ? press : undefined}
      {...longPressProps}
    >
      <PersonAvatar person={person} size={chipSize.avatar} />
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: chipSize.fontSize,
          lineHeight: chipSize.lineHeight,
        }}
      >
        {person.name}
      </Text>
    </Pressable>
  );
};
