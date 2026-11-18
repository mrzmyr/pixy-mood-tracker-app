import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Copy, Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import type { Emotion } from "@/types";

/** How long the description stays after a pick. */
const HINT_MS = 4000;

/**
 * Last picked emotion, shown for {@link HINT_MS}. `show` restarts the time
 * on every pick; `hide` clears it, for example when the emotion is
 * unpicked.
 */
export const useEmotionHint = () => {
  // A new object per pick, so a second pick of the same emotion restarts
  // the timer.
  const [shown, setShown] = useState<{ emotion: Emotion } | null>(null);
  useEffect(() => {
    if (shown === null) {
      return;
    }
    const timer = setTimeout(() => setShown(null), HINT_MS);
    return () => clearTimeout(timer);
  }, [shown]);
  return {
    emotion: shown?.emotion ?? null,
    show: (emotion: Emotion) => setShown({ emotion }),
    hide: () => setShown(null),
  };
};

/**
 * Short card at the bottom of the emotion list with the picked emotion and
 * its description, so the user can check the word fits. Floats over the
 * list, so the grid never moves. Screen readers hear it once.
 */
export const EmotionHint = ({ emotion }: { emotion: Emotion | null }) => {
  const colors = useColors();
  if (emotion === null || !emotion.description) {
    return null;
  }
  return (
    <Animated.View
      key={emotion.key}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      testID="emotion-hint"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 8,
        zIndex: 2,
      }}
    >
      <View
        style={{
          gap: 2,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: RADIUS.md,
          borderCurve: "continuous",
          backgroundColor: colors.logCardBackground,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.10)",
        }}
      >
        <Label size={14} strong>
          {emotion.label}
        </Label>
        <Copy size={14} style={{ color: colors.textSecondary }}>
          {emotion.description}
        </Copy>
      </View>
    </Animated.View>
  );
};
