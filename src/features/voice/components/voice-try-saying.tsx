import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Copy, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

/** Time each example stays before the next one fades in. */
const CYCLE_MS = 4500;

/**
 * Empty state of voice mode: a quiet hint in the middle of the sky, before
 * the first card appears. Cycles through `examples`, so a user who does not
 * know what to say gets a few ideas. Reduced motion: no fade.
 */
export const VoiceTrySaying = ({ examples }: { examples: string[] }) => {
  const colors = useColors();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (examples.length < 2) {
      return;
    }
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % examples.length),
      CYCLE_MS
    );
    return () => clearInterval(timer);
  }, [examples.length]);

  const example = examples[index] ?? "";

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(150)}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        // Quiet: a hint behind the content, not content.
        opacity: 0.75,
      }}
      testID="voice-try-saying"
      accessibilityLiveRegion="polite"
    >
      <Label size={14} style={{ color: colors.textSecondary }}>
        {t("voice_try_saying")}
      </Label>
      <View style={{ minHeight: 56, justifyContent: "center" }}>
        <Animated.View
          key={example}
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(300)}
        >
          <Copy
            size={18}
            style={{ color: colors.textSecondary, textAlign: "center" }}
          >
            {t("voice_example_quote", { example })}
          </Copy>
        </Animated.View>
      </View>
    </Animated.View>
  );
};
