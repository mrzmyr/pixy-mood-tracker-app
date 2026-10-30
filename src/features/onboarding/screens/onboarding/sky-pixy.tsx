import { useEffect, useId } from "react";
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
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeComposite,
  FeFlood,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  FeOffset,
  Filter,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { usePixyIdle } from "@/features/logger";
import type { FlightZone } from "./flight-zone-context";

/** Box size. The cloud fills about 70 points; the rest holds its shadow. */
const SIZE = 84;
/** Leaves room around the cloud, mostly below, for the shadow blur. */
const VIEW_BOX = "-6 -4 112 112";
/** Shadow tint: sky blue, darker. A black shadow looks dirty on the sky. */
const SHADOW = "#1d4f8a";
const INK = "#1c2740";
const EYE_Y = 54;
const EYE_RX = 7;
const EYE_RY = 9.6;
const EYES_X = [40.5, 59.5];
/** Puffs sit in a ring around the body, like petals. */
const PUFFS = Array.from({ length: 7 }, (_, index) => {
  const angle = ((-90 + (index * 360) / 7) * Math.PI) / 180;
  return { cx: 50 + Math.cos(angle) * 24, cy: 52 + Math.sin(angle) * 22 };
});
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

/** Four-point sparkle, centered on `x`, `y`. */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

const Eye = ({ cx, isBlinking }: { cx: number; isBlinking: boolean }) => {
  if (isBlinking) {
    return (
      <Path
        d={`M${cx - EYE_RX} ${EYE_Y + 1} Q${cx} ${EYE_Y + 4} ${cx + EYE_RX} ${EYE_Y + 1}`}
        stroke={INK}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <G>
      <Ellipse cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill={INK} />
      <Path d={sparkle(cx - 1.5, EYE_Y - 3.6, 3.8)} fill="#fff" />
      <Circle cx={cx + 2.4} cy={EYE_Y + 4} r={1.2} fill="#fff" />
    </G>
  );
};

/**
 * Cloud Pixy: a bright white puff with sparkling eyes. Two shadows follow
 * the cloud outline, a tight one close under it and a wide soft one, so it
 * floats in front of the sky.
 */
const CloudPixy = ({ isBlinking }: { isBlinking: boolean }) => {
  const id = useId().replaceAll(":", "");
  const fill = `url(#${id}body)`;

  return (
    <Svg width={SIZE} height={SIZE} viewBox={VIEW_BOX}>
      <Defs>
        <LinearGradient
          id={`${id}body`}
          x1="0"
          y1="14"
          x2="0"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor="#ffffff" />
          <Stop offset={0.6} stopColor="#fbfdff" />
          <Stop offset={1} stopColor="#dde9f7" />
        </LinearGradient>
        <Filter
          id={`${id}shadow`}
          x="-6"
          y="-4"
          width="112"
          height="112"
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur in="SourceAlpha" stdDeviation={1.2} result="near" />
          <FeOffset in="near" dy={1.5} result="nearOffset" />
          <FeFlood floodColor={SHADOW} floodOpacity={0.22} result="nearTint" />
          <FeComposite
            in="nearTint"
            in2="nearOffset"
            operator="in"
            result="nearShadow"
          />
          <FeGaussianBlur in="SourceAlpha" stdDeviation={4.5} result="far" />
          <FeOffset in="far" dy={6} result="farOffset" />
          <FeFlood floodColor={SHADOW} floodOpacity={0.16} result="farTint" />
          <FeComposite
            in="farTint"
            in2="farOffset"
            operator="in"
            result="farShadow"
          />
          <FeMerge>
            <FeMergeNode in="farShadow" />
            <FeMergeNode in="nearShadow" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>
      <G filter={`url(#${id}shadow)`}>
        <Circle cx={50} cy={52} r={28} fill={fill} />
        {PUFFS.map(({ cx, cy }) => (
          <Circle key={cx} cx={cx} cy={cy} r={15} fill={fill} />
        ))}
      </G>
      {EYES_X.map((cx) => (
        <Eye key={cx} cx={cx} isBlinking={isBlinking} />
      ))}
    </Svg>
  );
};

/**
 * Cloud Pixy flies a slow, looping path inside `zone`, the free sky the
 * current slide marks with `SkyFlightZone`, and leans into its turns. It
 * never crosses text: on a new zone it fades out, moves, and fades back in.
 * Pixy shrinks to fit a small zone. No zone, or one too small, hides it. `boost` (0 to 1) speeds the flight
 * up while the clouds rush to the next step. A tap excites Pixy: it zips
 * around its zone with a happy hop, then calms down. Render only when
 * motion is allowed.
 */
export const SkyPixy = ({
  boost,
  zone,
}: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
}) => {
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion: false });

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
        <CloudPixy isBlinking={idle.isBlinking} />
      </Pressable>
    </Animated.View>
  );
};
