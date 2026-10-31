import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { CLOUD_PIXY_SIZE, CloudPixy } from "@/components/cloud-pixy";

/** Free sky in window coordinates, or in the coordinates of Pixy's layer. */
export interface FlightZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Box size of `CloudPixy`. */
const SIZE = CLOUD_PIXY_SIZE;
/** Up and down bob, in points. Pixy keeps this far from the zone edges. */
const BOB = 3;
/** Pixy shrinks to fit small zones, down to this scale. Smaller hides it. */
const MIN_SCALE = 0.6;
/** Matches the slide fade: out with the old slide, in with the new one. */
const FADE_OUT_MS = 250;
const FADE_IN_DELAY_MS = 150;
const FADE_IN_MS = 700;
/** Extra flight speed at the peak of a step change. */
const MAX_BOOST = 3;
/** Extra flight speed right after a tap. */
const MAX_EXCITEMENT = 6;
/** A tap excites Pixy at once, then it calms down over this time. */
const EXCITE_IN_MS = 180;
const CALM_DOWN_MS = 2600;

/**
 * Cloud Pixy flies a slow, looping path inside `zone`, the free sky the
 * current screen marks (onboarding: `SkyFlightZone`), and leans into its turns. It
 * never crosses text: on a new zone it fades out, moves, and fades back in.
 * Pixy shrinks to fit a small zone. No zone, or one too small, hides it. `boost` (0 to 1) speeds the flight
 * up while the clouds rush to the next step. A tap excites Pixy: it zips
 * around its zone with a happy hop, then calms down. Render only when
 * motion is allowed.
 */
export const SkyPixy = ({
  boost,
  zone,
  isBlinking,
}: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
  /** Eyes closed for a blink, from the caller's `usePixyIdle`. */
  isBlinking: boolean;
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

  const excite = () => {
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
    const hop = -Math.abs(Math.sin(t * 3)) * excitement.get() * BOB;
    const squash = 1 + Math.sin(t * 6) * 0.06 * excitement.get();
    return {
      opacity: opacity.get(),
      transform: [
        // Scale works around the center, so the offsets place the center.
        {
          translateX:
            zoneX.get() + zoneWidth.get() / 2 + pathX * rangeX - SIZE / 2,
        },
        {
          translateY:
            zoneY.get() +
            zoneHeight.get() / 2 +
            pathY * rangeY +
            bob +
            hop -
            SIZE / 2,
        },
        { rotate: `${dx * 40}deg` },
        { scale: scale.get() },
        { scaleX: squash },
        { scaleY: 2 - squash },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, top: 0 }, flightStyle]}
    >
      {/* A toy with no function: screen readers skip it. */}
      <Pressable
        onPress={excite}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <CloudPixy isBlinking={isBlinking} />
      </Pressable>
    </Animated.View>
  );
};
