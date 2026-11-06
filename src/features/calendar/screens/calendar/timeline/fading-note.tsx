import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import useColors from "@/hooks/use-colors";
import {
  NoteContent,
  hasMention,
  parseNote,
  spliceSegments,
  toDisplayText,
} from "@/features/people";

const FONT_SIZE = 16;
const LINE_HEIGHT = 23;
const MAX_LINES = 4;
// Text past this never shows; skipping it keeps layout cheap for 10,000
// character notes.
const MAX_CHARACTERS = 400;

/**
 * Entry note on a timeline card: at most 4 lines, then the last line fades
 * into the card instead of ending in "…".
 */
export const FadingNote = ({ message }: { message: string }) => {
  const colors = useColors();
  // Cut by shown text, not Markdown, so no mention breaks in half.
  const { visible, isCut } = useMemo(() => {
    const segments = parseNote(message);
    const display = toDisplayText(segments);
    const lines = display.slice(0, MAX_CHARACTERS).split("\n");
    const end = lines.slice(0, MAX_LINES + 1).join("\n").length;
    return {
      visible: spliceSegments(segments, end, display.length, []),
      isCut: end < display.length,
    };
  }, [message]);
  const isMentioned = hasMention(message);
  const [isClipped, setIsClipped] = useState(isCut);

  return (
    <View style={{ maxHeight: LINE_HEIGHT * MAX_LINES, overflow: "hidden" }}>
      <Text
        onTextLayout={(event) => {
          setIsClipped(event.nativeEvent.lines.length > MAX_LINES || isCut);
        }}
        style={{
          fontSize: FONT_SIZE,
          lineHeight: LINE_HEIGHT,
          color: colors.text,
        }}
      >
        {isMentioned ? (
          <NoteContent note={message} segments={visible} fontSize={FONT_SIZE} />
        ) : (
          toDisplayText(visible)
        )}
      </Text>
      {isClipped && (
        <LinearGradient
          pointerEvents="none"
          colors={[
            colors.logCardBackgroundTransparent,
            colors.logCardBackground,
          ]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: LINE_HEIGHT * 1.5,
          }}
        />
      )}
    </View>
  );
};
