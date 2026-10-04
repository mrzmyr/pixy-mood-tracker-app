import { Pressable, Text, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { Person } from "../PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";

const DEFAULT_STYLE = {};

/**
 * Chip for one person, shared by the logger slide, entry cards, filters,
 * and statistics so a person looks the same everywhere.
 *
 * - `chip`: avatar plus name, like a tag pill
 * - `large`: big avatar with the name below, for the person screen
 */
export const PersonChip = ({
  person,
  selected = false,
  variant = "chip",
  onPress,
  style = DEFAULT_STYLE,
  testID,
  previewUri = null,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  selected?: boolean;
  variant?: "chip" | "large";
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  /** Picked image not stored yet; only the `large` variant shows it. */
  previewUri?: string | null;
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
