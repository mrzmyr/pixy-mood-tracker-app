import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { View } from "react-native";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";

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
  const visible = message
    .slice(0, MAX_CHARACTERS)
    .split("\n")
    .slice(0, MAX_LINES + 1)
    .join("\n");
  const [isClipped, setIsClipped] = useState(visible.length < message.length);

  return (
    <View style={{ maxHeight: LINE_HEIGHT * MAX_LINES, overflow: "hidden" }}>
      <Copy
        size={16}
        onTextLayout={(event) => {
          setIsClipped(
            event.nativeEvent.lines.length > MAX_LINES ||
              visible.length < message.length
          );
        }}
        style={{ lineHeight: LINE_HEIGHT, color: colors.text }}
      >
        {visible}
      </Copy>
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
