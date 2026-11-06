import { Pressable, StyleSheet, Text, View } from "react-native";
import { Copy } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { withOffsets } from "../mentions";
import type { NoteSegment } from "../mentions";
import type { Person } from "../people-provider";
import { PersonAvatar } from "./person-avatar";

const ROW_HEIGHT = 44;
const AVATAR_SIZE = 28;

/**
 * Children of the note input: text as is, mentions highlighted like in
 * Slack. The text must match the input text character by character.
 */
export const MentionSpans = ({ segments }: { segments: NoteSegment[] }) => {
  const colors = useColors();
  return (
    <>
      {withOffsets(segments).map(({ segment, offset }) =>
        segment.type === "text" ? (
          <Text key={offset}>{segment.text}</Text>
        ) : (
          <Text
            key={offset}
            style={{
              color: colors.tagTextActive,
              backgroundColor: colors.tagBackgroundActive,
            }}
          >
            {`@${segment.name}`}
          </Text>
        )
      )}
    </>
  );
};

/** People matching the typed `@` query. Renders nothing without matches. */
export const MentionSuggestions = ({
  candidates,
  onPick,
  style,
}: {
  candidates: Person[];
  onPick: (person: Person) => void;
  style?: React.ComponentProps<typeof View>["style"];
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  if (candidates.length === 0) {
    return null;
  }

  return (
    <View
      testID="mention-suggestions"
      style={[
        {
          borderRadius: RADIUS.md,
          borderCurve: "continuous",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.logCardBorder,
          backgroundColor: colors.logCardBackground,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {candidates.map((person) => (
        <Pressable
          key={person.id}
          testID={`mention-suggestion-${person.id}`}
          accessibilityRole="button"
          accessibilityLabel={person.name}
          onPress={() => {
            void haptics.selection();
            onPick(person);
          }}
          style={({ pressed }) => ({
            height: ROW_HEIGHT,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <PersonAvatar person={person} size={AVATAR_SIZE} />
          <Copy
            size={16}
            numberOfLines={1}
            style={{ flexShrink: 1, color: colors.text }}
          >
            {person.name}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
};
