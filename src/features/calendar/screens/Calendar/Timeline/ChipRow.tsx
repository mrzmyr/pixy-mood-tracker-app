import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import useColors from "@/hooks/useColors";

/** Card padding; chips line up with the note above. */
const INSET = 16;
const FADE_WIDTH = 40;
// Scroll positions within this distance of an edge count as the edge.
const END_TOLERANCE = 1;

/**
 * One line of compact chips on a timeline card. Chips past the card edge
 * fade out and scroll sideways; scrolled chips also fade at the left edge. A tap on the row calls `onPress`, like a tap
 * on the card.
 */
export const ChipRow = ({
  children,
  onPress,
  testID,
}: {
  children: ReactNode[];
  onPress: () => void;
  testID?: string;
}) => {
  const colors = useColors();
  const [viewWidth, setViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  if (children.length === 0) {
    return null;
  }
  const isOverflowing = contentWidth > viewWidth + END_TOLERANCE;

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: INSET }}
        onLayout={(event) => setViewWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        scrollEventThrottle={32}
        onScroll={({ nativeEvent }) => {
          const end =
            nativeEvent.contentOffset.x + nativeEvent.layoutMeasurement.width >=
            nativeEvent.contentSize.width - END_TOLERANCE;
          const start = nativeEvent.contentOffset.x <= END_TOLERANCE;
          if (start !== isAtStart) {
            setIsAtStart(start);
          }
          if (end !== isAtEnd) {
            setIsAtEnd(end);
          }
        }}
      >
        {/* Own press handler inside the scroll view: a drag cancels it and
            scrolls. Left to the card's Pressable, a drag opens the entry. */}
        <Pressable accessible={false} onPress={onPress}>
          {/* Chips are pressable elsewhere; here they must not catch taps. */}
          <View pointerEvents="none" style={{ flexDirection: "row", gap: 6 }}>
            {children}
          </View>
        </Pressable>
      </ScrollView>
      {isOverflowing && !isAtStart && (
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            colors.logCardBackground,
            colors.logCardBackgroundTransparent,
          ]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: INSET,
          }}
        />
      )}
      {isOverflowing && !isAtEnd && (
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            colors.logCardBackgroundTransparent,
            colors.logCardBackground,
          ]}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: FADE_WIDTH,
          }}
        />
      )}
    </View>
  );
};
