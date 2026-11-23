import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { getTextRevealKeyframes } from "@/components/text-reveal-parts";
import { getTextStyle } from "@/components/typography";
import { SPACE } from "@/constants/space";
import { PersonAvatar, usePeopleState } from "@/features/people";
import type { Person } from "@/features/people";
import useColors from "@/hooks/use-colors";
import { findHighlights } from "../highlights";
import type { VoiceTerm } from "../match-transcript";
import type { MoodTrigger } from "../mood-triggers";
import { getTranscriptWords } from "../transcript-words";
import type { TranscriptWord } from "../transcript-words";

/** Height where the oldest lines dissolve into the background. */
const FADE_HEIGHT = 96;
const TEXT_STYLE = getTextStyle("copy", 24);
/** Avatar before a spoken name: a bit smaller than the 24 pt text. */
const AVATAR_SIZE = 22;
/** Highlight: medium weight only, text color unchanged. */
const MENTION_STYLE = { fontWeight: "500" } as const;
// Same keyframes as the recap stories (`TextReveal`), timed for speech:
// about 2.5 spoken words per second, so one word settles as the next comes.
const KEYFRAMES = getTextRevealKeyframes(TEXT_STYLE.fontSize ?? 24);
const WORD_DURATION_MS = 500;
// The recognizer sends words in bursts. Words of one burst follow each
// other, and a long burst still finishes within BURST_MAX_MS.
const WORD_STAGGER_MS = 90;
const BURST_MAX_MS = 600;

const styles = StyleSheet.create({
  lines: { flexDirection: "row", flexWrap: "wrap" },
  word: { flexDirection: "row", alignItems: "center" },
  avatar: { marginRight: SPACE.xs },
});

const Word = ({
  word,
  person,
  delay,
  isReducedMotion,
  color,
}: {
  word: TranscriptWord;
  person: Person | undefined;
  delay: number;
  isReducedMotion: boolean;
  color: string;
}) => (
  <Animated.View
    style={[
      styles.word,
      !isReducedMotion && {
        animationName: KEYFRAMES,
        animationDuration: WORD_DURATION_MS,
        animationDelay: delay,
        animationFillMode: "backwards",
        animationTimingFunction: "ease-out",
      },
    ]}
  >
    {person && (
      <View style={styles.avatar}>
        <PersonAvatar person={person} size={AVATAR_SIZE} />
      </View>
    )}
    <Text style={[TEXT_STYLE, { color }]}>
      {word.segments.map(({ text, isHighlight }, index) =>
        isHighlight ? (
          // oxlint-disable-next-line react-doctor/no-array-index-as-key -- segments of one word never reorder
          <Text key={index} style={MENTION_STYLE}>
            {text}
          </Text>
        ) : (
          text
        )
      )}{" "}
    </Text>
  </Animated.View>
);

/**
 * Live transcript. Words fade in and rise as they are recognized, like the
 * recap stories. Newest line sits at the bottom, older lines push up and
 * dissolve at the top edge. Known people, tags, and emotions, plus the
 * first mood trigger, show in medium weight. People also get their avatar
 * before the name. No scrolling: the check-in shows the full text for
 * review. Reduced motion: words appear without animation.
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
  const isReducedMotion = useReducedMotion();
  const { people } = usePeopleState();
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people]
  );
  const words = useMemo(
    () => getTranscriptWords(text, findHighlights(text, terms, triggers)),
    [text, terms, triggers]
  );
  // Start delay per word, set once when the word first shows, so a later
  // render never restarts its animation. New words of one burst follow
  // each other.
  const [delays, setDelays] = useState<number[]>([]);
  if (delays.length !== words.length) {
    const burst = words.length - delays.length;
    const stagger = Math.min(
      WORD_STAGGER_MS,
      BURST_MAX_MS / Math.max(1, burst)
    );
    setDelays(
      burst > 0
        ? [...delays, ...Array.from({ length: burst }, (_, i) => i * stagger)]
        : delays.slice(0, words.length)
    );
  }
  const fade = chroma(background);

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
      <View
        style={styles.lines}
        testID="voice-transcript"
        accessible
        accessibilityRole="text"
        accessibilityLabel={text}
        accessibilityLiveRegion="polite"
      >
        {words.map((word, index) => (
          <Word
            // oxlint-disable-next-line react-doctor/no-array-index-as-key -- a revised word keeps its place and must not animate again
            key={index}
            word={word}
            person={
              word.personId === undefined
                ? undefined
                : peopleById.get(word.personId)
            }
            delay={delays[index] ?? 0}
            isReducedMotion={isReducedMotion}
            color={colors.text}
          />
        ))}
      </View>
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
