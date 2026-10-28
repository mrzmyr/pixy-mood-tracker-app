import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { Pixy } from "@/features/logger";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { StoryText } from "./parts";
import type { SlideContext } from "./slides";

/** Pixy floats up and down this far, in points. */
const FLOAT = 6;

/** Pixy pops in, then floats gently and blinks, like on the confirmation. */
const FloatingPixy = () => {
  const isReduced = useReducedMotion();
  const offset = useSharedValue(0);
  useEffect(() => {
    if (isReduced) {
      return;
    }
    const half = { duration: 1400, easing: Easing.inOut(Easing.sin) };
    offset.set(
      withRepeat(
        withSequence(withTiming(-FLOAT, half), withTiming(0, half)),
        -1
      )
    );
  }, [isReduced, offset]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={style}>
      <Pixy size={112} tone="good" isIdle />
    </Animated.View>
  );
};

/**
 * Second to last slide: Pixy thanks the user for looking back, with kind
 * words and why looking back helps. The story screen sends confetti.
 */
export const StoryThanks = ({ ctx }: { ctx: SlideContext }) => {
  const theme = ctx.isDark ? "night" : "paper";
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        paddingHorizontal: 8,
      }}
      testID="recap-story-thanks"
    >
      <FloatingPixy />
      <View style={{ alignItems: "center", gap: 10 }}>
        <StoryText kind="eyebrow" theme={theme} tone="muted">
          {ctx.period.kind === "week"
            ? t("recaps_story_finale_eyebrow_week")
            : t("recaps_story_finale_eyebrow", {
                month: monthName(ctx.period.start),
              })}
        </StoryText>
        <StoryText kind="title" theme={theme} style={{ textAlign: "center" }}>
          {t("recaps_story_finale_title")}
        </StoryText>
      </View>
      <View style={{ alignItems: "center", gap: 12 }}>
        <StoryText
          kind="body"
          theme={theme}
          style={{ fontSize: 17, lineHeight: 24, textAlign: "center" }}
        >
          {t("recaps_story_thanks_kind")}
        </StoryText>
        <StoryText
          kind="body"
          theme={theme}
          tone="muted"
          style={{ fontSize: 17, lineHeight: 24, textAlign: "center" }}
        >
          {t("recaps_story_thanks_why")}
        </StoryText>
      </View>
    </View>
  );
};
