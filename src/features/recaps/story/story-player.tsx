import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import X from "lucide-react-native/icons/x";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { StoryText } from "./parts";
import { STORY_PALETTE, STORY_SLIDE_MS } from "./theme";
import type { StoryTheme } from "./theme";

/** One slide as the player sees it: background theme and content. */
export interface PlayerSlide {
  key: string;
  theme: StoryTheme;
  backdrop?: React.ReactNode;
  content: React.ReactNode;
  /** Waits for the user instead of moving on, for example a quiz. */
  isWaiting?: boolean;
}

const barState = (position: number, index: number) => {
  if (position < index) {
    return "done";
  }
  return position === index ? "current" : "next";
};

const ProgressBar = ({
  state,
  progress,
  theme,
}: {
  state: "done" | "current" | "next";
  progress: ReturnType<typeof useSharedValue<number>>;
  theme: StoryTheme;
}) => {
  const fill = useAnimatedStyle(() => ({
    width: `${(state === "current" ? progress.get() : Number(state === "done")) * 100}%`,
  }));
  const color = theme === "paper" ? "#0A0A0A" : "#FFFFFF";
  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: RADIUS.full,
        overflow: "hidden",
        backgroundColor:
          theme === "paper" ? "rgba(10,10,10,0.15)" : "rgba(255,255,255,0.3)",
      }}
    >
      <Animated.View style={[{ height: 3, backgroundColor: color }, fill]} />
    </View>
  );
};

/**
 * Full-screen story. Tap the right two thirds for the next slide, the left
 * third for the previous one; press and hold to pause. Each slide moves on
 * after 7 seconds, except waiting slides. `renderBottom` draws per slide below
 * the content (Share, Helpful, Not Helpful).
 */
export const StoryPlayer = ({
  slides,
  title,
  onClose,
  onSlideShown,
  renderBottom,
  isPaused: isPausedFromParent = false,
}: {
  slides: PlayerSlide[];
  title: string;
  onClose: () => void;
  /** Every slide change. The first slide counts on open, in the parent. */
  onSlideShown: (index: number) => void;
  renderBottom: (index: number, theme: StoryTheme) => React.ReactNode;
  /** A sheet on top: the slide holds still until it closes. */
  isPaused?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const progress = useSharedValue(0);
  const slide = slides[index];
  const theme = slide?.theme ?? "night";
  const palette = STORY_PALETTE[theme];
  const isPaused = isPausedByUser || isPausedFromParent;
  const isWaiting = slide?.isWaiting ?? false;

  /** Runs the bar from where it stopped to the end of the slide. */
  const start = () => {
    const remaining = (1 - progress.get()) * STORY_SLIDE_MS;
    progress.set(withTiming(1, { duration: remaining, easing: Easing.linear }));
  };

  const goTo = (next: number) => {
    if (next >= slides.length) {
      onClose();
      return;
    }
    const target = Math.max(0, next);
    cancelAnimation(progress);
    progress.set(0);
    setIndex(target);
    if (target !== index) {
      onSlideShown(target);
    }
    if (!isPaused && !slides[target]?.isWaiting) {
      start();
    }
  };

  const onBarFull = () => goTo(index + 1);
  // A full bar moves on. Reset to 0 happens before the next run starts.
  useAnimatedReaction(
    () => progress.get() >= 1,
    (isFull, wasFull) => {
      if (isFull && !wasFull) {
        scheduleOnRN(onBarFull);
      }
    },
    [index]
  );

  // Pausing keeps the bar where it is; resuming runs it on.
  const onPauseChange = useEffectEvent((isHeld: boolean) => {
    if (isHeld) {
      cancelAnimation(progress);
    } else {
      start();
    }
  });
  useEffect(() => {
    onPauseChange(isPaused || isWaiting);
  }, [isPaused, isWaiting]);

  // Pressable skips `onPress` after a long press, so letting go only resumes.
  const onPress = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    goTo(locationX < 120 ? index - 1 : index + 1);
  };

  if (!slide) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {slide.backdrop}
      <Pressable
        accessible={false}
        style={StyleSheet.absoluteFill}
        onLongPress={() => setIsPausedByUser(true)}
        delayLongPress={250}
        onPressOut={() => setIsPausedByUser(false)}
        onPress={onPress}
        testID="recap-story-tap"
      >
        <View
          key={slide.key}
          pointerEvents="box-none"
          style={{
            flex: 1,
            paddingTop: insets.top + 76,
            paddingBottom: insets.bottom + 84,
            paddingHorizontal: 24,
          }}
          testID={`recap-story-slide-${slide.key}`}
        >
          {slide.content}
        </View>
      </Pressable>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 12,
          right: 12,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", gap: 4 }}>
          {slides.map((item, position) => (
            <ProgressBar
              key={item.key}
              theme={theme}
              progress={progress}
              state={barState(position, index)}
            />
          ))}
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          pointerEvents="box-none"
        >
          <StoryText
            kind="label"
            theme={theme}
            style={{ fontSize: 15, flex: 1 }}
          >
            {title}
            <StoryText kind="label" theme={theme} tone="muted">
              {`  ${index + 1}/${slides.length}`}
            </StoryText>
          </StoryText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              isPausedByUser ? "recaps_story_play" : "recaps_story_pause"
            )}
            hitSlop={10}
            onPress={() => setIsPausedByUser((current) => !current)}
            testID="recap-story-pause"
            style={{ padding: 6 }}
          >
            {isPausedByUser ? (
              <Play width={20} height={20} color={palette.text} />
            ) : (
              <Pause width={20} height={20} color={palette.text} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            hitSlop={10}
            onPress={onClose}
            testID="recap-story-close"
            style={{ padding: 6 }}
          >
            <X width={22} height={22} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 16,
        }}
      >
        {renderBottom(index, theme)}
      </View>

      {/* Screen readers move by button, not by tap zones. */}
      <View
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_story_previous")}
          onPress={() => goTo(index - 1)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("recaps_story_next")}
          onPress={() => goTo(index + 1)}
        />
      </View>
    </View>
  );
};
