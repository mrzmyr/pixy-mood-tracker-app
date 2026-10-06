import { Check } from "lucide-react-native";
import { Pressable, Text, View, useColorScheme } from "react-native";
import type { PressableProps, ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { Person } from "../PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";
import { RADIUS } from "@/constants/Radius";

const DEFAULT_STYLE = {};
/** Space between avatar and selection ring of the `tile` variant. */
export const TILE_RING_GAP = 3;
/** Selection ring of the `tile` variant; adds to the tile's outer size. */
export const TILE_RING_WIDTH = 3;
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
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 3,
    avatar: 16,
    gap: 6,
    fontSize: 13,
  },
};

type LongPressProps = Pick<
  PressableProps,
  "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
>;

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
      <View
        style={{
          padding: TILE_RING_GAP,
          borderRadius: size,
          borderWidth: TILE_RING_WIDTH,
          borderColor: selected ? colors.tint : "transparent",
        }}
      >
        <PersonAvatar person={person} size={size} />
      </View>
      {selected && (
        <View
          style={{
            position: "absolute",
            top: size + 2 * (TILE_RING_GAP + TILE_RING_WIDTH) - 28,
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
          maxWidth: size + 2 * (TILE_RING_GAP + TILE_RING_WIDTH),
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
 * - `tile`: grid cell for the logger slide; selection shows a ring and a
 *   check badge, so it reads without relying on color alone
 *
 * `onLongPress` opens the person editor in `chip` and `tile`; screen readers
 * get it as the "edit" action.
 */
export const PersonChip = ({
  person,
  selected = false,
  variant = "chip",
  onPress,
  onLongPress,
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

  const longPressProps: LongPressProps = onLongPress
    ? {
        onLongPress: async () => {
          await haptics.impact();
          onLongPress();
        },
        accessibilityActions: [{ name: "edit", label: t("edit") }],
        onAccessibilityAction: ({ nativeEvent }) => {
          if (nativeEvent.actionName === "edit") {
            onLongPress();
          }
        },
      }
    : {};

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
        borderRadius: RADIUS.full,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingLeft: chipSize.paddingLeft,
        paddingRight: chipSize.paddingRight,
        paddingVertical: chipSize.paddingVertical,
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
          marginLeft: chipSize.gap,
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: chipSize.fontSize,
        }}
      >
        {person.name}
      </Text>
    </Pressable>
  );
};
