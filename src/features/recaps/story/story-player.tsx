import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
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
import { PixyGuideContext } from "@/components/pixy-guide-context";
import type { PixyGuide } from "@/components/pixy-guide-context";
import { SkyPixy } from "@/components/sky-pixy";
import type { FlightZone } from "@/components/sky-pixy";
import { SteppedSky } from "@/components/stepped-sky";
import { DURATION, getEasing } from "@/constants/motion";
import { RADIUS } from "@/constants/radius";
import { usePixyIdle } from "@/features/logger";
import { t } from "@/lib/translation";
import { StoryPressContext } from "./press-context";
import { StoryHoldContext } from "./hold-context";
import { getPageStep } from "./story-motion";
import { STORY_PALETTE, STORY_SCREEN_PADDING, STORY_SLIDE_MS } from "./theme";
import type { StoryTheme } from "./theme";

/** One slide as the player sees it: background theme and content. */
export interface PlayerSlide {
  key: string;
  theme: StoryTheme;
  content: React.ReactNode;
  /** Waits for the user instead of moving on, for example a quiz. */
  isWaiting?: boolean;
  /**
   * Last slide that stays until the user closes it: no timer, its bar shows
   * full, so the user can look around.
   */
  isHeld?: boolean;
  /** Time on screen. Default `STORY_SLIDE_MS`. */
  durationMs?: number;
  /**
   * Slide draws its own buttons at the bottom edge, where Share and
   * feedback sit on other slides. `renderBottom` draws nothing for it.
   */
  hasOwnButtons?: boolean;
}

/** Pixy waits for the first slide to settle, then glides in this long. */
const PIXY_ARRIVAL_DELAY_MS = 400;
const PIXY_ARRIVAL_MS = 2400;

/**
 * Cloudy with the blink of the confirmation Pixy. Glides in from beyond
 * the right screen edge once, when the story opens.
 */
const BlinkingSkyPixy = ({
  boost,
  zone,
  guide,
}: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
  guide: PixyGuide;
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
      <SkyPixy
        boost={boost}
        zone={zone}
        isBlinking={idle.isBlinking}
        guide={guide}
      />
    </Animated.View>
  );
};

/**
 * Slides with Cloudy above them. Holds the zone the slide reports, so a
 * new zone re-renders only Pixy: `children` keep their identity. A slide
 * control calls Pixy over through `PixyGuideContext`.
 */
const CloudyLayer = ({
  boost,
  isShown,
  children,
}: {
  boost: SharedValue<number>;
  isShown: boolean;
  children: React.ReactNode;
}) => {
  const [zone, setZone] = useState<FlightZone | null>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const follow = useSharedValue(0);
  const joy = useSharedValue(0);
  const cheers = useSharedValue(0);
  // Same object across renders: slide controls keep effects on it.
  const guide = useMemo<PixyGuide>(
    () => ({ x, y, follow, joy, cheers }),
    [x, y, follow, joy, cheers]
  );
  return (
    <>
      <FlightZoneContext.Provider value={setZone}>
        <PixyGuideContext value={isShown ? guide : null}>
          {children}
        </PixyGuideContext>
      </FlightZoneContext.Provider>
      {/* Above the slides so it takes taps. */}
      {isShown && <BlinkingSkyPixy boost={boost} zone={zone} guide={guide} />}
    </>
  );
};

/** Bottom buttons pause the story through this, like the pause button. */
export interface PlayerControls {
  pause: () => void;
}

/** Holding hides the slider and buttons this fast, so the slide shows at once. */
const CHROME_FADE_MS = 80;

/**
 * One thin slider at the bottom edge, like Instagram Reels: it flows
 * through the whole story, slide by slide, as each slide's time runs.
 */
const StorySlider = ({
  index,
  count,
  progress,
  theme,
  isHidden,
}: {
  index: number;
  count: number;
  progress: SharedValue<number>;
  theme: StoryTheme;
  /** Fades out with the other controls while the user holds. */
  isHidden: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const chrome = useAnimatedStyle(() => ({
    opacity: withTiming(isHidden ? 0 : 1, { duration: CHROME_FADE_MS }),
  }));
  const fill = useAnimatedStyle(() => ({
    width: `${((index + progress.get()) / Math.max(1, count)) * 100}%`,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      style={[
        {
          position: "absolute",
          left: 12,
          right: 12,
          // Below Share and feedback, just above the home indicator.
          bottom: Math.max(insets.bottom - 12, 4),
          height: 3,
          borderRadius: RADIUS.full,
          overflow: "hidden",
          backgroundColor:
            theme === "paper" ? "rgba(10,10,10,0.15)" : "rgba(255,255,255,0.3)",
        },
        chrome,
      ]}
      testID="recap-story-slider"
    >
      <Animated.View
        style={[
          {
            height: 3,
            backgroundColor: theme === "paper" ? "#0A0A0A" : "#FFFFFF",
          },
          fill,
        ]}
      />
    </Animated.View>
  );
};

/** Points a drag moves up or down before it pages; sideways moves fail it. */
const AXIS_LOCK_DISTANCE = 10;
/** A new slide enters from this far below or above. */
const ENTER_DISTANCE = 120;

/**
 * Content of a new slide comes in from the side the swipe pushed it from:
 * from below for the next slide, from above for the previous one.
 */
const enteringFrom = (
  direction: 1 | -1,
  easing: ReturnType<typeof getEasing>
) => {
  const from = direction * ENTER_DISTANCE;
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateY: from }] },
      animations: {
        opacity: withTiming(1, { duration: DURATION.base }),
        transform: [
          {
            translateY: withTiming(0, { duration: DURATION.base, easing }),
          },
        ],
      },
    };
  };
};

/**
 * `next` for slide buttons. A button that also changes `slides`, for
 * example opens more slides, moves on after the render with the new list,
 * not with the old one.
 */
const useNextAfterRender = (advance: () => void) => {
  const [requests, setRequests] = useState(0);
  const run = useEffectEvent(advance);
  useEffect(() => {
    if (requests > 0) {
      run();
    }
  }, [requests]);
  return () => setRequests((count) => count + 1);
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
 * Vertical paging of the story, like Instagram Reels. The slide follows
 * the finger; past the first or last slide it only gives a little. On
 * release it leaves the screen and `onPage` shows the next or previous
 * slide, or it slides back into place. A swipe down on the first slide
 * fails here, so the parent's drag closes the story.
 */
const useSwipePaging = ({
  index,
  count,
  onPage,
}: {
  index: number;
  count: number;
  onPage: (step: -1 | 1) => void;
}) => {
  const { height } = useWindowDimensions();
  const easing = getEasing("move");
  // A swipe holds the slide until it pages or slides back.
  const [isSwiping, setIsSwiping] = useState(false);
  const swipe = useSharedValue(0);

  const onSwipeEnd = (step: -1 | 0 | 1) => {
    setIsSwiping(false);
    if (step !== 0) {
      onPage(step);
    }
  };

  const isFirst = index === 0;
  const gesture = usePanGesture({
    maxPointers: 1,
    activeOffsetY: isFirst
      ? -AXIS_LOCK_DISTANCE
      : [-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE],
    failOffsetY: isFirst ? AXIS_LOCK_DISTANCE : undefined,
    failOffsetX: [-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE],
    onActivate: () => {
      scheduleOnRN(setIsSwiping, true);
    },
    onUpdate: (event) => {
      const canPage = event.translationY < 0 ? index < count - 1 : index > 0;
      swipe.set(canPage ? event.translationY : event.translationY / 4);
    },
    onDeactivate: (event) => {
      const step = event.canceled
        ? 0
        : getPageStep({
            translationY: event.translationY,
            velocityY: event.velocityY,
            screenHeight: height,
            index,
            count,
          });
      swipe.set(
        withTiming(
          step === 0 ? 0 : -step * height,
          { duration: DURATION.fast, easing },
          (isFinished) => {
            if (isFinished) {
              scheduleOnRN(onSwipeEnd, step);
            }
          }
        )
      );
    },
  });

  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(swipe.get()) / height),
    transform: [{ translateY: swipe.get() }],
  }));

  /**
   * The new slide is on screen: back into place. Not earlier, or the old
   * slide flashes back; it left the screen invisible.
   */
  const handleSlideLayout = () => {
    if (!isSwiping) {
      swipe.set(0);
    }
  };

  return { gesture, style, isSwiping, handleSlideLayout, easing };
};

/**
 * The current slide inside the swipe: it moves with the finger, and a new
 * slide comes in from the side the swipe pushed it from.
 */
const PagedSlide = ({
  slide,
  paging,
  direction,
  children,
}: {
  slide: PlayerSlide;
  paging: ReturnType<typeof useSwipePaging>;
  direction: 1 | -1;
  children: React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View pointerEvents="box-none" style={[{ flex: 1 }, paging.style]}>
      <Animated.View
        key={slide.key}
        entering={enteringFrom(direction, paging.easing)}
        onLayout={paging.handleSlideLayout}
        pointerEvents="box-none"
        style={{
          flex: 1,
          paddingTop: insets.top + 76,
          // Own buttons sit where Share and feedback sit.
          paddingBottom: insets.bottom + (slide.hasOwnButtons ? 16 : 84),
          paddingHorizontal: STORY_SCREEN_PADDING,
        }}
        testID={`recap-story-slide-${slide.key}`}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Full-screen story, paged like Instagram Reels. Swipe up for the next
 * slide, down for the previous one; the slide follows the finger. A
 * swipe down on the first slide is left to the parent, which closes the
 * story. Tap to pause or play; press and hold to pause and see the slide
 * alone: slider, buttons, and feedback fade out until you let go. One
 * slider at the bottom flows through the whole story. Each slide moves
 * on after its time, except waiting and held slides. The last slide
 * stays until the user closes it. Going to another slide plays the story again.
 * `renderBottom` draws per slide below the content (Share, Helpful, Not
 * Helpful); its `controls.pause` stops the story while the user acts.
 */
export const StoryPlayer = ({
  slides,
  onClose,
  onSlideShown,
  renderBottom,
  isPaused: isPausedFromParent = false,
}: {
  slides: PlayerSlide[];
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
}) => {
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  // One sky and one Cloudy across every slide, as in onboarding.
  const skyBoost = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  // Press and hold pauses only while held; the pause button pauses until tapped again.
  const [isHolding, setIsHolding] = useState(false);
  // Slide content holds the story while a detail is open (`StoryHoldContext`).
  const [isHeldBySlide, setIsHeldBySlide] = useState(false);
  const paging = useSwipePaging({
    index,
    count: slides.length,
    // oxlint-disable-next-line no-use-before-define -- the hook calls `goTo` only after a swipe, after render.
    onPage: (step) => goTo(index + step),
  });
  const { isSwiping } = paging;
  // Side the current slide came in from: 1 below, -1 above.
  const [direction, setDirection] = useState<1 | -1>(1);
  const progress = useSharedValue(0);
  const slide = slides[index];
  const theme = slide?.theme ?? "night";
  const palette = STORY_PALETTE[theme];
  const isPaused =
    isPausedByUser ||
    isHolding ||
    isHeldBySlide ||
    isSwiping ||
    isPausedFromParent;
  // Holding hides the slider, buttons, and feedback, like Instagram Reels.
  const isChromeHidden = isHolding;
  const chrome = useAnimatedStyle(() => ({
    opacity: withTiming(isChromeHidden ? 0 : 1, { duration: CHROME_FADE_MS }),
  }));
  const isWaiting = (slide?.isWaiting || slide?.isHeld) ?? false;

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
    // A held slide fills its part of the slider: nothing more runs out.
    progress.set(slides[target]?.isHeld ? 1 : 0);
    setDirection(target < index ? -1 : 1);
    setIndex(target);
    setIsPausedByUser(false);
    setIsHeldBySlide(false);
    if (target !== index) {
      onSlideShown(target);
    }
    const isTimed = !slides[target]?.isWaiting && !slides[target]?.isHeld;
    if (!isHolding && !isSwiping && !isPausedFromParent && isTimed) {
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
  // A tap pauses or plays, like Instagram Reels; swipes move the story.
  const onPress = () => setIsPausedByUser((current) => !current);

  const controls: PlayerControls = {
    pause: () => setIsPausedByUser(true),
  };
  const next = useNextAfterRender(() => goTo(index + 1));

  if (!slide) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.background },
        ]}
      >
        <SteppedSky step={index} boost={skyBoost} />
        <CloudyLayer boost={skyBoost} isShown={!isReducedMotion}>
          <GestureDetector gesture={paging.gesture}>
            <Pressable
              accessible={false}
              style={StyleSheet.absoluteFill}
              onLongPress={() => setIsHolding(true)}
              delayLongPress={200}
              onPressOut={() => setIsHolding(false)}
              onPress={onPress}
              testID="recap-story-tap"
            >
              <PagedSlide slide={slide} paging={paging} direction={direction}>
                <StoryPressContext value={{ onPress, setIsHolding, next }}>
                  <StoryHoldContext value={setIsHeldBySlide}>
                    {slide.content}
                  </StoryHoldContext>
                </StoryPressContext>
              </PagedSlide>
            </Pressable>
          </GestureDetector>
        </CloudyLayer>
      </View>

      <Animated.View
        pointerEvents={isChromeHidden ? "none" : "box-none"}
        style={[
          {
            position: "absolute",
            top: insets.top + 8,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          },
          chrome,
        ]}
      >
        {/* No title or counter: the slider shows where the story is. */}
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

      <StorySlider
        index={index}
        count={slides.length}
        progress={progress}
        theme={theme}
        isHidden={isChromeHidden}
      />

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
