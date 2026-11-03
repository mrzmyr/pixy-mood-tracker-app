import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { CLOUDY_SIZE, Cloudy } from "@/components/cloudy";
import { getJoyLevel } from "@/components/pixy-guide-context";
import type { PixyGuide } from "@/components/pixy-guide-context";
import { SkyPixyEmotes } from "@/components/sky-pixy-emotes";

/** Free sky in window coordinates, or in the coordinates of Pixy's layer. */
export interface FlightZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Box size of `Cloudy`. */
const SIZE = CLOUDY_SIZE;
/** Up and down bob, in points. Pixy keeps this far from the zone edges. */
const BOB = 3;
/** Pixy shrinks to fit small zones, down to this scale. Smaller hides it. */
const MIN_SCALE = 0.6;
/** Matches the slide fade: out with the old slide, in with the new one. */
const FADE_OUT_MS = 250;
const FADE_IN_DELAY_MS = 150;
const FADE_IN_MS = 700;
/** Happy eyes on their own: this long, every 8 to 16 seconds. */
const HAPPY_IDLE_MS = 1400;
const HAPPY_EVERY_MIN_MS = 8000;
const HAPPY_EVERY_SPREAD_MS = 8000;
/** Extra flight speed at the peak of a step change. */
const MAX_BOOST = 3;
/** Extra flight speed right after a tap. */
const MAX_EXCITEMENT = 6;
/** Happy eyes after a cheer. */
const CHEER_HAPPY_MS = 2600;
/** Hover above a guide target: gentle sway, in points. */
const HOVER_SWAY = 4;
/** A tap excites Pixy at once, then it calms down over this time. */
const EXCITE_IN_MS = 180;
const CALM_DOWN_MS = 2600;
/** Happy eyes after a tap. */
const EXCITED_HAPPY_MS = EXCITE_IN_MS + CALM_DOWN_MS;

/**
 * Cloudy flies a slow, looping path inside `zone`, the free sky the
 * current screen marks (onboarding: `SkyFlightZone`), and leans into its turns. It
 * never crosses text: on a new zone it fades out, moves, and fades back in.
 * Pixy shrinks to fit a small zone. No zone, or one too small, hides it. `boost` (0 to 1) speeds the flight
 * up while the clouds rush to the next step. A tap excites Pixy: it zips
 * around its zone with a happy hop and "^^" eyes, then calms down. Now and
 * then it smiles on its own. `guide` calls Pixy over to a control: it
 * glides there, hovers, and sends sparkles while the user acts; each new
 * `cheers` count makes it hop with a burst. Render only when motion is
 * allowed.
 */
export const SkyPixy = ({
  boost,
  zone,
  isBlinking,
  guide,
}: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
  /** Eyes closed for a blink, from the caller's `usePixyIdle`. */
  isBlinking: boolean;
  guide?: PixyGuide;
}) => {
  const excitement = useSharedValue(0);
  const time = useSharedValue(0);
  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (timeSincePreviousFrame === null) {
      return;
    }
    const speed =
      1 + boost.get() * MAX_BOOST + excitement.get() * MAX_EXCITEMENT;
    time.set(time.get() + (timeSincePreviousFrame / 1000) * speed);
  });

  // Happy "^^" eyes: while excited, and now and then on their own.
  const [isHappy, setIsHappy] = useState(false);
  const calm = useRef<ReturnType<typeof setTimeout>>(null);
  const smile = (durationMs: number) => {
    setIsHappy(true);
    if (calm.current) {
      clearTimeout(calm.current);
    }
    calm.current = setTimeout(() => setIsHappy(false), durationMs);
  };
  const smileNow = useEffectEvent(() => smile(HAPPY_IDLE_MS));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          smileNow();
          next();
        },
        HAPPY_EVERY_MIN_MS + Math.random() * HAPPY_EVERY_SPREAD_MS
      );
    };
    next();
    return () => {
      clearTimeout(timer);
      if (calm.current) {
        clearTimeout(calm.current);
      }
    };
  }, []);

  const excite = (happyMs: number = EXCITED_HAPPY_MS) => {
    smile(happyMs);
    excitement.set(
      withSequence(
        withTiming(1, { duration: EXCITE_IN_MS }),
        withTiming(0, {
          duration: CALM_DOWN_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  };

  // Joy from the guide keeps the "^^" eyes on; a cheer hops a bit longer.
  const [joyLevel, setJoyLevel] = useState(0);
  useAnimatedReaction(
    () => getJoyLevel(guide?.joy.get() ?? 0),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setJoyLevel, current);
      }
    }
  );
  const onCheer = () => excite(CHEER_HAPPY_MS);
  useAnimatedReaction(
    () => guide?.cheers.get() ?? 0,
    (current, previous) => {
      if (previous !== null && current > previous) {
        scheduleOnRN(onCheer);
      }
    }
  );

  const opacity = useSharedValue(0);
  const zoneX = useSharedValue(0);
  const zoneY = useSharedValue(0);
  const zoneWidth = useSharedValue(0);
  const zoneHeight = useSharedValue(0);
  const scale = useSharedValue(1);

  const x = zone?.x ?? 0;
  const y = zone?.y ?? 0;
  const width = zone?.width ?? 0;
  const height = zone?.height ?? 0;
  useEffect(() => {
    const fitScale = Math.min(1, (height - BOB * 2) / SIZE, width / SIZE);
    const isFitting = fitScale >= MIN_SCALE;
    const hide = withTiming(0, { duration: FADE_OUT_MS });
    if (!isFitting) {
      opacity.set(hide);
      return;
    }
    const move = (value: number) =>
      withDelay(FADE_OUT_MS, withTiming(value, { duration: 0 }));
    zoneX.set(move(x));
    zoneY.set(move(y));
    zoneWidth.set(move(width));
    zoneHeight.set(move(height));
    scale.set(move(fitScale));
    opacity.set(
      withSequence(
        hide,
        withDelay(FADE_IN_DELAY_MS, withTiming(1, { duration: FADE_IN_MS }))
      )
    );
  }, [
    x,
    y,
    width,
    height,
    opacity,
    zoneX,
    zoneY,
    zoneWidth,
    zoneHeight,
    scale,
  ]);

  const flightStyle = useAnimatedStyle(() => {
    const t = time.get();
    const size = SIZE * scale.get();
    const rangeX = (zoneWidth.get() - size) / 2;
    const rangeY = Math.max(0, (zoneHeight.get() - size) / 2 - BOB);
    // Two slow sines per axis with unrelated periods: the path never
    // repeats in a way the eye catches.
    const pathX = 0.7 * Math.sin(t * 0.21) + 0.3 * Math.sin(t * 0.53 + 1.3);
    const pathY =
      0.6 * Math.sin(t * 0.17 + 0.6) + 0.4 * Math.sin(t * 0.41 + 2.1);
    const dx = 0.147 * Math.cos(t * 0.21) + 0.159 * Math.cos(t * 0.53 + 1.3);
    const bob = Math.sin(t * 2.2) * BOB;
    // Happy hop and a little squash while excited. The hop stays inside
    // the bob room.
    const squash = 1 + Math.sin(t * 6) * 0.06 * excitement.get();
    const freeX = zoneX.get() + zoneWidth.get() / 2 + pathX * rangeX;
    const freeY = zoneY.get() + zoneHeight.get() / 2 + pathY * rangeY;
    // Toward the guide target: hovers there with a gentle sway, upright.
    const follow = guide?.follow.get() ?? 0;
    // Hovering at a guide target, Pixy has room for a 3 times higher hop.
    const hop =
      -Math.abs(Math.sin(t * 3)) * excitement.get() * BOB * (1 + 2 * follow);
    const hoverX = (guide?.x.get() ?? 0) + Math.sin(t * 0.9) * HOVER_SWAY;
    const hoverY = guide?.y.get() ?? 0;
    const centerX = freeX + (hoverX - freeX) * follow;
    const centerY = freeY + (hoverY - freeY) * follow;
    return {
      opacity: Math.max(opacity.get(), follow),
      transform: [
        // Scale works around the center, so the offsets place the center.
        { translateX: centerX - SIZE / 2 },
        { translateY: centerY + bob + hop - SIZE / 2 },
        { rotate: `${dx * 40 * (1 - follow)}deg` },
        { scale: scale.get() + (1 - scale.get()) * follow },
        { scaleX: squash },
        { scaleY: 2 - squash },
      ],
    };
  });

  const pixy = (
    <Animated.View
      style={[{ position: "absolute", left: 0, top: 0 }, flightStyle]}
    >
      {/* A toy with no function: screen readers skip it. */}
      <Pressable
        onPress={() => excite()}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Cloudy isBlinking={isBlinking} isHappy={isHappy || joyLevel > 0} />
      </Pressable>
    </Animated.View>
  );
  if (!guide) {
    return pixy;
  }
  return (
    <>
      <SkyPixyEmotes
        x={guide.x}
        y={guide.y}
        level={joyLevel}
        cheers={guide.cheers}
      />
      {pixy}
    </>
  );
};
