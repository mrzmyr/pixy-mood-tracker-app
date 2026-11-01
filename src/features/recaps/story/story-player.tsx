import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import X from "lucide-react-native/icons/x";
import { FlightZoneContext } from "@/components/flight-zone-context";
import { SkyPixy } from "@/components/sky-pixy";
import type { FlightZone } from "@/components/sky-pixy";
import { SteppedSky } from "@/components/stepped-sky";
import { RADIUS } from "@/constants/radius";
import { usePixyIdle } from "@/features/logger";
import { t } from "@/lib/translation";
import { StoryCaptureContext } from "./capture-context";
import { StoryBrand } from "./story-brand";
import { STORY_PALETTE, STORY_SCREEN_PADDING, STORY_SLIDE_MS } from "./theme";
import type { StoryTheme } from "./theme";

/** One slide as the player sees it: background theme and content. */
export interface PlayerSlide {
  key: string;
  theme: StoryTheme;
  content: React.ReactNode;
  /** Waits for the user instead of moving on, for example a quiz. */
  isWaiting?: boolean;
  /** Time on screen. Default `STORY_SLIDE_MS`. */
  durationMs?: number;
}

/** Pixy waits for the first slide to settle, then glides in this long. */
const PIXY_ARRIVAL_DELAY_MS = 400;
const PIXY_ARRIVAL_MS = 2400;

/**
 * Cloud Pixy with the blink of the confirmation Pixy. Glides in from beyond
 * the right screen edge once, when the story opens.
 */
const BlinkingSkyPixy = ({
  boost,
  zone,
}: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
}) => {
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion: false });
  const { width } = useWindowDimensions();
  const arrival = useSharedValue(1);
  useEffect(() => {
    arrival.set(
      withDelay(
        PIXY_ARRIVAL_DELAY_MS,
        withTiming(0, {
          duration: PIXY_ARRIVAL_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [arrival]);
  const arrivalStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrival.get() * width }],
  }));
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, arrivalStyle]}
    >
      <SkyPixy boost={boost} zone={zone} isBlinking={idle.isBlinking} />
    </Animated.View>
  );
};

/**
 * Slides with cloud Pixy above them. Holds the zone the slide reports, so a
 * new zone re-renders only Pixy: `children` keep their identity.
 */
const CloudPixyLayer = ({
  boost,
  isShown,
  children,
}: {
  boost: SharedValue<number>;
  isShown: boolean;
  children: React.ReactNode;
}) => {
  const [zone, setZone] = useState<FlightZone | null>(null);
  return (
    <>
      <FlightZoneContext.Provider value={setZone}>
        {children}
      </FlightZoneContext.Provider>
      {/* Above the slides so it takes taps. */}
      {isShown && <BlinkingSkyPixy boost={boost} zone={zone} />}
    </>
  );
};

/** Bottom buttons pause the story through this, like the pause button. */
export interface PlayerControls {
  pause: () => void;
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
  progress: SharedValue<number>;
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

/** Content of a new slide rises in, like Instagram stories. */
const ENTERING = FadeInDown.duration(240);

/** Holding hides bars and buttons this fast, so the slide shows at once. */
const CHROME_FADE_MS = 80;

/** Brand of a shared slide: bottom left, where Share sits. */
const ScreenBrand = ({ theme }: { theme: StoryTheme }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 24,
        bottom: insets.bottom + 16,
        height: 44,
        justifyContent: "center",
      }}
    >
      <StoryBrand color={STORY_PALETTE[theme].text} />
    </View>
  );
};

/** Wall clock in ms. Only event handlers and effects call it. */
const now = () => Date.now();

/** Play state of the current slide, kept on the JS thread. */
interface Clock {
  /** Slide time already played before the current run, in ms. */
  played: number;
  /** When the current run started, `null` while stopped. */
  startedAt: number | null;
  /** Bumps on every slide change, so a stale run never moves on. */
  run: number;
}

/**
 * Full-screen story. Tap the right two thirds for the next slide, the left
 * third for the previous one; press and hold to pause and see the slide
 * alone: bars, buttons, and feedback fade out until you let go. Each slide
 * moves on after its time, except waiting slides. The last slide stays
 * until the user closes it. Going to another slide plays the story again.
 * `renderBottom` draws per slide below the content (Share, Helpful, Not
 * Helpful); its `controls.pause` stops the story while the user acts.
 * `isCapturing` swaps bars and buttons for the app icon and name, so the
 * shared image carries the brand in the bottom left corner, and puts slide
 * content on a see-through card (`SlideCard`).
 */
export const StoryPlayer = ({
  slides,
  slideRef,
  onClose,
  onSlideShown,
  renderBottom,
  isPaused: isPausedFromParent = false,
  isCapturing = false,
}: {
  slides: PlayerSlide[];
  /** Slide without bars and buttons, for sharing it as an image. */
  slideRef?: React.Ref<View>;
  onClose: () => void;
  /** Every slide change. The first slide counts on open, in the parent. */
  onSlideShown: (index: number) => void;
  renderBottom: (
    index: number,
    theme: StoryTheme,
    controls: PlayerControls
  ) => React.ReactNode;
  /** A sheet on top: the slide holds still until it closes. */
  isPaused?: boolean;
  /** The slide is being captured as an image. */
  isCapturing?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  // One sky and one cloud Pixy across every slide, as in onboarding.
  const skyBoost = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  // Press and hold pauses only while held; the pause button pauses until tapped again.
  const [isHolding, setIsHolding] = useState(false);
  const progress = useSharedValue(0);
  const slide = slides[index];
  const theme = slide?.theme ?? "night";
  const palette = STORY_PALETTE[theme];
  const isPaused = isPausedByUser || isHolding || isPausedFromParent;
  // Holding hides bars, buttons, and feedback, like Instagram stories.
  const isChromeHidden = isHolding || isCapturing;
  const chrome = useAnimatedStyle(() => ({
    opacity: withTiming(isChromeHidden ? 0 : 1, { duration: CHROME_FADE_MS }),
  }));
  const isWaiting = slide?.isWaiting ?? false;

  // The clock lives on the JS thread. Reading `progress` right after setting
  // it returns the old value, which made slides run short or stick.
  const clock = useRef<Clock>({ played: 0, startedAt: null, run: 0 });

  const durationOf = (position: number) =>
    slides[position]?.durationMs ?? STORY_SLIDE_MS;

  const stop = () => {
    const { startedAt } = clock.current;
    if (startedAt !== null) {
      clock.current.played += now() - startedAt;
      clock.current.startedAt = null;
    }
    cancelAnimation(progress);
  };

  /**
   * A full bar moves on; the last slide stays until the user closes it.
   * `position` comes with the run: this closure can be older than `index`.
   */
  const onRunEnd = (run: number, position: number) => {
    if (run !== clock.current.run) {
      return;
    }
    clock.current = {
      ...clock.current,
      played: durationOf(position),
      startedAt: null,
    };
    if (position < slides.length - 1) {
      // oxlint-disable-next-line no-use-before-define -- mutual recursion: a run ends, the next slide starts the next run. Called only after render.
      goTo(position + 1);
    }
  };

  /** Runs the bar of slide `position` from where it stopped to the end. */
  const play = (position: number) => {
    if (clock.current.startedAt !== null) {
      return;
    }
    const duration = durationOf(position);
    const left = Math.max(0, duration - clock.current.played);
    const { run } = clock.current;
    clock.current.startedAt = now();
    progress.set(
      withTiming(1, { duration: left, easing: Easing.linear }, (finished) => {
        if (finished) {
          scheduleOnRN(onRunEnd, run, position);
        }
      })
    );
  };

  /** Shows slide `next` from its start and plays the story. */
  const goTo = (next: number) => {
    if (next >= slides.length) {
      onClose();
      return;
    }
    const target = Math.max(0, next);
    cancelAnimation(progress);
    clock.current = { played: 0, startedAt: null, run: clock.current.run + 1 };
    progress.set(0);
    setIndex(target);
    setIsPausedByUser(false);
    if (target !== index) {
      onSlideShown(target);
    }
    if (!isHolding && !isPausedFromParent && !slides[target]?.isWaiting) {
      play(target);
    }
  };

  // Pausing keeps the bar where it is; resuming runs it on.
  const onPauseChange = useEffectEvent((isHeld: boolean) => {
    if (isHeld) {
      stop();
    } else {
      play(index);
    }
  });
  useEffect(() => {
    onPauseChange(isPaused || isWaiting);
  }, [isPaused, isWaiting]);

  // Pressable skips `onPress` after a long press, so letting go only resumes.
  // `pageX`, not `locationX`: `locationX` counts from the touched child,
  // so a tap on the right half over a small tile went back.
  const onPress = (event: GestureResponderEvent) => {
    const { pageX } = event.nativeEvent;
    goTo(pageX < 120 ? index - 1 : index + 1);
  };

  const controls: PlayerControls = {
    pause: () => setIsPausedByUser(true),
  };

  if (!slide) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        ref={slideRef}
        collapsable={false}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.background },
        ]}
      >
        <SteppedSky step={index} boost={skyBoost} />
        {/* Never in a shared image. */}
        <CloudPixyLayer
          boost={skyBoost}
          isShown={!isReducedMotion && !isCapturing}
        >
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onLongPress={() => setIsHolding(true)}
            delayLongPress={200}
            onPressOut={() => setIsHolding(false)}
            onPress={onPress}
            testID="recap-story-tap"
          >
            <Animated.View
              key={slide.key}
              entering={ENTERING}
              pointerEvents="box-none"
              style={{
                flex: 1,
                paddingTop: insets.top + 76,
                paddingBottom: insets.bottom + 84,
                paddingHorizontal: STORY_SCREEN_PADDING,
              }}
              testID={`recap-story-slide-${slide.key}`}
            >
              <StoryCaptureContext value={isCapturing}>
                {slide.content}
              </StoryCaptureContext>
            </Animated.View>
          </Pressable>
        </CloudPixyLayer>
        {isCapturing && <ScreenBrand theme={theme} />}
      </View>

      <Animated.View
        pointerEvents={isChromeHidden ? "none" : "box-none"}
        style={[
          {
            position: "absolute",
            top: insets.top + 8,
            left: 12,
            right: 12,
            gap: 12,
          },
          chrome,
        ]}
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
          {/* No title or counter: the bars already show where the story is. */}
          <View style={{ flex: 1 }} />
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
      </Animated.View>

      <Animated.View
        pointerEvents={isChromeHidden ? "none" : "box-none"}
        style={[
          {
            position: "absolute",
            left: STORY_SCREEN_PADDING,
            right: STORY_SCREEN_PADDING,
            bottom: insets.bottom + 16,
          },
          chrome,
        ]}
      >
        {renderBottom(index, theme, controls)}
      </Animated.View>

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
