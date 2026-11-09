import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { getTextRevealKeyframes } from "@/components/text-reveal-parts";

// Same timing as voice mode's live transcript: about 2.5 spoken words per
// second, so one word settles as the next comes. Words of one recognizer
// burst follow each other and finish within BURST_MAX_MS.
const WORD_DURATION_MS = 500;
const WORD_STAGGER_MS = 90;
const BURST_MAX_MS = 600;

const styles = StyleSheet.create({
  line: { flexDirection: "row", flexWrap: "wrap" },
});

interface NoteWord {
  text: string;
  /** Place among the words spoken in this session, which animate in. `-1`: earlier text. */
  newIndex: number;
}

/** Lines of `text`, each split into words. Words from `newFrom` on are new. */
const getLines = (text: string, newFrom: number) => {
  const lines: NoteWord[][] = [];
  let offset = 0;
  let newIndex = 0;
  for (const line of text.split("\n")) {
    const words: NoteWord[] = [];
    for (const match of line.matchAll(/\S+/gu)) {
      const isNew = offset + match.index >= newFrom;
      words.push({ text: match[0], newIndex: isNew ? newIndex : -1 });
      if (isNew) {
        newIndex += 1;
      }
    }
    lines.push(words);
    offset += line.length + 1;
  }
  return lines;
};

/**
 * Note text while voice input listens. Words spoken in this session fade in
 * and rise, like voice mode's live transcript; earlier note text stays
 * still. Shown over the hidden note input, in the same text style.
 * Reduced motion: words appear without animation.
 */
export const VoiceNoteText = ({
  text,
  newFrom,
  placeholder,
  style,
  placeholderColor,
}: {
  text: string;
  /** Length of the note before this session. Text after it animates in. */
  newFrom: number;
  /** Shown while nothing is in the note yet. */
  placeholder: string;
  style: StyleProp<TextStyle>;
  placeholderColor: string;
}) => {
  const isReducedMotion = useReducedMotion();
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 18;
  const lines = getLines(text, newFrom);
  const newCount = lines.flat().filter((word) => word.newIndex >= 0).length;
  // Start delay per new word, set once when the word first shows, so a
  // later render never restarts its animation.
  const [delays, setDelays] = useState<number[]>([]);
  if (delays.length !== newCount) {
    const burst = newCount - delays.length;
    const stagger = Math.min(
      WORD_STAGGER_MS,
      BURST_MAX_MS / Math.max(1, burst)
    );
    setDelays(
      burst > 0
        ? [...delays, ...Array.from({ length: burst }, (_, i) => i * stagger)]
        : delays.slice(0, newCount)
    );
  }

  if (text.trim() === "") {
    return (
      <Text style={[style, { color: placeholderColor }]}>{placeholder}</Text>
    );
  }

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text}>
      {lines.map((words, lineIndex) => (
        // oxlint-disable-next-line react-doctor/no-array-index-as-key -- lines only grow at the end while listening
        <View key={lineIndex} style={styles.line}>
          {words.length === 0 && <Text style={style}> </Text>}
          {words.map((word, wordIndex) => {
            const isNew = word.newIndex >= 0;
            return (
              <Animated.View
                // oxlint-disable-next-line react-doctor/no-array-index-as-key -- a revised word keeps its place and must not animate again
                key={wordIndex}
                style={
                  isNew && !isReducedMotion
                    ? {
                        animationName: getTextRevealKeyframes(fontSize),
                        animationDuration: WORD_DURATION_MS,
                        animationDelay: delays[word.newIndex] ?? 0,
                        animationFillMode: "backwards",
                        animationTimingFunction: "ease-out",
                      }
                    : undefined
                }
              >
                <Text style={style}>{word.text} </Text>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
};
