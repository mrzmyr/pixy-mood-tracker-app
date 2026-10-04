import { Check } from "lucide-react-native";
import { Pressable, Text, View, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { Person } from "../PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";

const DEFAULT_STYLE = {};
/** Space between avatar and selection ring of the `tile` variant. */
export const TILE_RING_GAP = 3;
/** Selection ring of the `tile` variant; adds to the tile's outer size. */
export const TILE_RING_WIDTH = 3;

/** `tile` variant of {@link PersonChip}; `onPress` already plays haptics. */
const PersonTile = ({
  person,
  selected,
  onPress,
  style,
  testID,
  size,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected: boolean;
  onPress?: () => void;
  style: ViewStyle;
  testID?: string;
  size: number;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
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
            borderRadius: 14,
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
 */
export const PersonChip = ({
  person,
  selected = false,
  variant = "chip",
  onPress,
  style = DEFAULT_STYLE,
  testID,
  previewUri = null,
  size = 88,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected?: boolean;
  variant?: "chip" | "large" | "tile";
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  /** Picked image not stored yet; only the `large` variant shows it. */
  previewUri?: string | null;
  /** Avatar diameter of the `tile` variant. */
  size?: number;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const press = async () => {
    if (!onPress) {
      return;
    }
    await haptics.selection();
    onPress();
  };

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
        borderRadius: 100,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingLeft: 8,
        paddingRight: 16,
        paddingVertical: 6,
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
      onPress={onPress ? press : undefined}
    >
      <PersonAvatar person={person} size={24} />
      <Text
        numberOfLines={1}
        style={{
          marginLeft: 8,
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: 17,
        }}
      >
        {person.name}
      </Text>
    </Pressable>
  );
};
