import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Copy } from "@/components/typography";
import { SPACE } from "@/constants/space";
import { PersonAvatar, usePeopleState } from "@/features/people";
import useColors from "@/hooks/use-colors";
import { findHighlights } from "../highlights";
import type { VoiceTerm } from "../match-transcript";
import type { MoodTrigger } from "../mood-triggers";

/** Height where the oldest lines dissolve into the background. */
const FADE_HEIGHT = 96;
/** Avatar before a spoken name: a bit smaller than the 24 pt text. */
const AVATAR_SIZE = 22;
// Inline views sit on the text baseline, a bit below the middle of the
// line. Measured on iPhone 14 at 24 pt text.
const AVATAR_BASELINE_SHIFT = -3;
// Narrow no-break space: keeps avatar and name on one line.
const AVATAR_GAP = "\u202F";

/**
 * Live transcript. Newest line sits at the bottom, older lines push up and
 * dissolve at the top edge. Known people, tags, and emotions, plus the
 * first mood trigger, get a tint like a Slack mention. People also get
 * their avatar before the name. No scrolling: the check-in shows the full
 * text for review.
 */
export const VoiceTranscript = ({
  text,
  terms,
  triggers,
  background,
}: {
  text: string;
  terms: VoiceTerm[];
  triggers: MoodTrigger[];
  /** Screen color: the top fade blends into it. */
  background: string;
}) => {
  const colors = useColors();
  const { people } = usePeopleState();
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people]
  );
  const highlights = useMemo(
    () => findHighlights(text, terms, triggers),
    [text, terms, triggers]
  );
  const fade = chroma(background);
  const mention = {
    color: colors.tint,
    backgroundColor: chroma(colors.tint).alpha(0.14).css(),
  };

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const { kind, id, start, end } of highlights) {
    const person = kind === "person" ? peopleById.get(id) : undefined;
    parts.push(
      text.slice(cursor, start),
      <Text
        key={`${kind}:${id}:${start}`}
        style={mention}
        testID={`voice-highlight-${kind}`}
      >
        {person && (
          <View style={{ transform: [{ translateY: AVATAR_BASELINE_SHIFT }] }}>
            <PersonAvatar person={person} size={AVATAR_SIZE} />
          </View>
        )}
        {person && AVATAR_GAP}
        {text.slice(start, end)}
      </Text>
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        justifyContent: "flex-end",
        paddingHorizontal: SPACE.xl,
        paddingBottom: SPACE.lg,
      }}
    >
      <Copy
        size={24}
        testID="voice-transcript"
        accessibilityLiveRegion="polite"
      >
        {parts}
      </Copy>
      <LinearGradient
        pointerEvents="none"
        colors={[fade.css(), fade.alpha(0.65).css(), fade.alpha(0).css()]}
        locations={[0, 0.42, 1]}
        style={[
          StyleSheet.absoluteFill,
          { bottom: undefined, height: FADE_HEIGHT },
        ]}
      />
    </View>
  );
};
