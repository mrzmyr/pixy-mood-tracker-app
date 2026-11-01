import { useEffect, useEffectEvent, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { RADIUS } from "@/constants/radius";
import { measureStoryCard, shouldCloseStory } from "./story-motion";
import type { Frame } from "./story-motion";

/** Instagram grows a story in 70 to 100 ms. A little slower reads calmer. */
const OPEN_MS = 180;
/** Release to gone, with the crossfade at its end. */
const CLOSE_MS = 250;
/** The story and the backdrop fade out over the end of the close. */
const CLOSE_FADE_MS = 140;
/** Without a card: notification taps and Reduce Motion. */
const FADE_MS = 200;
/** A card that left the screen: the story shrinks this much while it fades. */
const FALLBACK_SCALE = 0.9;
/** Fast at first, soft landing, no overshoot. */
const EASING = Easing.bezier(0.2, 0, 0, 1);

/** A drag of this share of the screen height scales the story the most. */
const DRAG_FULL_RATIO = 0.5;
const DRAG_MIN_SCALE = 0.85;
/** Corners are fully round after this many points of drag. */
const DRAG_ROUND_DISTANCE = 80;
const DRAG_RADIUS = 32;
/** The backdrop keeps this opacity at the longest drag. */
const DRAG_MIN_BACKDROP = 0.3;
/** Points a drag moves down before it starts; horizontal moves fail it. */
const AXIS_LOCK_DISTANCE = 10;

// A type, not an interface: Reanimated animates only plain object types.
type StoryFrame = Pick<Frame, "x" | "y" | "width" | "height"> & {
  radius: number;
};

/** 0 at the start of a drag down, 1 at its longest. */
const dragProgress = (translationY: number, height: number) => {
  "worklet";
  return Math.min(1, Math.max(0, translationY) / (height * DRAG_FULL_RATIO));
};

/** Story frame `translationY` points into a drag down. */
const dragFrame = (
  translationY: number,
  width: number,
  height: number
): StoryFrame => {
  "worklet";
  const distance = Math.max(0, translationY);
  const progress = dragProgress(translationY, height);
  const scale = 1 - (1 - DRAG_MIN_SCALE) * progress;
  return {
    x: (width * (1 - scale)) / 2,
    y: (height * (1 - scale)) / 2 + distance,
    width: width * scale,
    height: height * scale,
    radius: DRAG_RADIUS * Math.min(1, distance / DRAG_ROUND_DISTANCE),
  };
};

/**
 * Open and close of the story, like Instagram stories.
 *
 * With `origin`, the story grows out of the tapped card and shrinks back
 * into it: the whole story scales as one unit, no mask uncovers it. A drag
 * down moves and scales it with the finger while the backdrop lightens.
 * Without `origin` (notification taps) or with Reduce Motion, the story
 * fades. `isOpen` turns true when the open ends; start the timer then.
 * `close` measures the card again (`cardKey`) and calls `onClosed` when
 * the story is gone. A card that left the screen: fade and scale down.
 */
export const useStoryTransition = ({
  origin,
  cardKey,
  onClosed,
}: {
  origin: Frame | null;
  cardKey: string;
  onClosed: () => void;
}) => {
  const { width, height } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const full: StoryFrame = { x: 0, y: 0, width, height, radius: 0 };
  const isGrowing = origin !== null && !isReducedMotion;
  const frame = useSharedValue<StoryFrame>(
    isGrowing ? { ...origin, radius: RADIUS.md } : full
  );
  const opacity = useSharedValue(isGrowing ? 1 : 0);
  const backdrop = useSharedValue(0);
  const isClosing = useSharedValue(false);
  const hasClosed = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Waits two UI frames: mounting the story keeps the UI thread busy for a
  // moment, and an open started on mount ended before the story showed.
  const open = useEffectEvent(() => {
    const onOpened = (isFinished?: boolean) => {
      "worklet";
      if (isFinished) {
        scheduleOnRN(setIsOpen, true);
      }
    };
    scheduleOnUI(() => {
      "worklet";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (isGrowing) {
            backdrop.set(withTiming(1, { duration: OPEN_MS, easing: EASING }));
            frame.set(
              withTiming(full, { duration: OPEN_MS, easing: EASING }, onOpened)
            );
          } else {
            backdrop.set(withTiming(1, { duration: FADE_MS }));
            opacity.set(withTiming(1, { duration: FADE_MS }, onOpened));
          }
        })
      );
    });
  });
  useEffect(() => open(), []);

  const onDone = (isFinished?: boolean) => {
    "worklet";
    if (isFinished) {
      scheduleOnRN(onClosed);
    }
  };

  const fadeOut = () => {
    backdrop.set(withTiming(0, { duration: FADE_MS }));
    opacity.set(withTiming(0, { duration: FADE_MS }, onDone));
  };

  /** Shrinks into the card, or fades when there is none. Runs once. */
  const close = async () => {
    if (hasClosed.current) {
      return;
    }
    hasClosed.current = true;
    isClosing.set(true);
    if (isReducedMotion || origin === null) {
      fadeOut();
      return;
    }
    const card = await measureStoryCard(cardKey, { width, height });
    const fade = withDelay(
      CLOSE_MS - CLOSE_FADE_MS,
      withTiming(0, { duration: CLOSE_FADE_MS })
    );
    if (card) {
      backdrop.set(fade);
      opacity.set(fade);
      frame.set(
        withTiming(
          { ...card, radius: RADIUS.md },
          { duration: CLOSE_MS, easing: EASING },
          onDone
        )
      );
      return;
    }
    // The card scrolled away or unmounted: shrink in place while fading.
    const now = frame.get();
    const smaller = {
      width: now.width * FALLBACK_SCALE,
      height: now.height * FALLBACK_SCALE,
    };
    backdrop.set(withTiming(0, { duration: FADE_MS }));
    opacity.set(withTiming(0, { duration: FADE_MS }));
    frame.set(
      withTiming(
        {
          ...smaller,
          x: now.x + (now.width - smaller.width) / 2,
          y: now.y + (now.height - smaller.height) / 2,
          radius: Math.max(now.radius, RADIUS.md),
        },
        { duration: FADE_MS, easing: EASING },
        onDone
      )
    );
  };

  const gesture = usePanGesture({
    enabled: isOpen,
    maxPointers: 1,
    activeOffsetY: AXIS_LOCK_DISTANCE,
    failOffsetY: -AXIS_LOCK_DISTANCE,
    failOffsetX: [-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE],
    onActivate: () => {
      scheduleOnRN(setIsDragging, true);
    },
    onUpdate: (event) => {
      if (isClosing.get()) {
        return;
      }
      frame.set(dragFrame(event.translationY, width, height));
      backdrop.set(
        1 - (1 - DRAG_MIN_BACKDROP) * dragProgress(event.translationY, height)
      );
    },
    onDeactivate: (event) => {
      if (isClosing.get()) {
        return;
      }
      const isClosed =
        !event.canceled &&
        shouldCloseStory({
          translationY: event.translationY,
          velocityY: event.velocityY,
          screenHeight: height,
        });
      if (isClosed) {
        scheduleOnRN(close);
        return;
      }
      backdrop.set(withTiming(1, { duration: OPEN_MS, easing: EASING }));
      frame.set(withTiming(full, { duration: OPEN_MS, easing: EASING }));
      scheduleOnRN(setIsDragging, false);
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const frameStyle = useAnimatedStyle(() => {
    const now = frame.get();
    return {
      left: now.x,
      top: now.y,
      width: now.width,
      height: now.height,
      borderRadius: now.radius,
      opacity: opacity.get(),
    };
  });
  // The story keeps its full-screen layout and scales into the frame.
  const contentStyle = useAnimatedStyle(() => {
    const now = frame.get();
    return {
      transform: [
        { scaleX: now.width / width },
        { scaleY: now.height / height },
      ],
    };
  });

  return {
    isOpen,
    isDragging,
    close,
    gesture,
    backdropStyle,
    frameStyle,
    contentStyle,
    width,
    height,
  };
};

/**
 * Dark backdrop and the story frame of `useStoryTransition`. The screen
 * below shows through while the story grows, drags, and shrinks.
 */
export const StoryTransitionView = ({
  transition,
  children,
}: {
  transition: ReturnType<typeof useStoryTransition>;
  children: React.ReactNode;
}) => (
  <>
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "black" },
        transition.backdropStyle,
      ]}
    />
    <GestureDetector gesture={transition.gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            overflow: "hidden",
            borderCurve: "continuous",
          },
          transition.frameStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: transition.width,
              height: transition.height,
              transformOrigin: [0, 0, 0],
            },
            transition.contentStyle,
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  </>
);
