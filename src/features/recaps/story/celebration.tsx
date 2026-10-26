import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

/** CE1: confetti bursts from a point. CE2: confetti rains over the screen. */
export type CelebrationKind = "burst" | "wave";

/** Where a celebration starts, in screen points. */
export interface CelebrationOrigin {
  x: number;
  y: number;
}

/**
 * Party confetti colors, Tailwind red-500, orange-500, amber-400,
 * yellow-300, green-500, teal-400, blue-500, violet-500, pink-500. Never
 * the mood or Pixy colors: confetti should look like real paper, not data.
 */
const CONFETTI_COLORS = [
  "#EF4444",
  "#F97316",
  "#FBBF24",
  "#FDE047",
  "#22C55E",
  "#2DD4BF",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const PIECES = { burst: 70, wave: 120 } as const;
/** Seconds until the last piece is gone. */
const SECONDS = { burst: 3.2, wave: 4.2 } as const;
/** Pull down, in points per second squared. */
const GRAVITY = 1100;
/** Air drag per second: paper slows fast and falls at about 300 pt/s. */
const DRAG = 3.4;

/** Stable pseudo-random value 0 to 1 per piece, so renders match. */
const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
};

/** Start state of one piece, all random but stable per index. */
interface Piece {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  delay: number;
  width: number;
  height: number;
  isRound: boolean;
  color: string;
  spin: number;
  flip: number;
  sway: number;
  phase: number;
}

const makePiece = (
  index: number,
  kind: CelebrationKind,
  origin: CelebrationOrigin,
  screenWidth: number
): Piece => {
  const r = (salt: number) => noise(index * 31 + salt);
  const isRound = r(1) < 0.18;
  const base = {
    id: `${kind}-${index}`,
    width: isRound ? 7 : 6 + r(2) * 4,
    height: isRound ? 7 : 10 + r(3) * 7,
    isRound,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? "#EF4444",
    spin: (r(4) - 0.5) * 720,
    flip: 6 + r(5) * 8,
    sway: 10 + r(6) * 22,
    phase: r(7) * Math.PI * 2,
  };
  if (kind === "burst") {
    // A cone that opens upward, like a party popper.
    const angle = -Math.PI / 2 + (r(8) - 0.5) * 2.6;
    const speed = 650 + r(9) * 900;
    return {
      ...base,
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      delay: r(10) * 0.08,
    };
  }
  // Rain: pieces start above the screen and drift down in waves.
  return {
    ...base,
    x: r(8) * screenWidth,
    y: -20 - r(9) * 80,
    vx: (r(10) - 0.5) * 160,
    vy: 40 + r(11) * 160,
    delay: r(12) * 1.4,
  };
};

const ConfettiPiece = ({
  piece,
  clock,
  seconds,
}: {
  piece: Piece;
  clock: SharedValue<number>;
  seconds: number;
}) => {
  const style = useAnimatedStyle(() => {
    const time = Math.max(0, clock.get() * seconds - piece.delay);
    const slow = 1 - Math.exp(-DRAG * time);
    const terminal = GRAVITY / DRAG;
    // Drag eats the throw, gravity wins until paper falls at a steady pace.
    const x =
      piece.x +
      (piece.vx / DRAG) * slow +
      Math.sin(time * 3 + piece.phase) * piece.sway * slow;
    const y = piece.y + terminal * time + ((piece.vy - terminal) / DRAG) * slow;
    const left = seconds - piece.delay - time;
    return {
      opacity: time === 0 ? 0 : Math.min(1, left / 0.6),
      transform: [
        { translateX: x - piece.width / 2 },
        { translateY: y - piece.height / 2 },
        { rotate: `${piece.spin * time}deg` },
        // Paper tumbles: its height flips through 0 as it turns.
        { scaleY: Math.cos(time * piece.flip + piece.phase) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: piece.width,
          height: piece.height,
          borderRadius: piece.isRound ? piece.width / 2 : 1.5,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
};

/**
 * Paper confetti for a right quiz answer and the thanks slide. `burst`
 * pops from `origin`, `wave` rains over the whole screen. Drag, gravity,
 * sway, and tumble make each piece fall like paper. Draws nothing with
 * Reduce Motion on. Remount with a new `key` to play again.
 */
export const Celebration = ({
  kind,
  origin,
}: {
  kind: CelebrationKind;
  origin: CelebrationOrigin;
}) => {
  const { width } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const seconds = SECONDS[kind];
  useEffect(() => {
    clock.set(
      withTiming(1, { duration: seconds * 1000, easing: Easing.linear })
    );
  }, [clock, seconds]);
  if (isReducedMotion) {
    return null;
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: PIECES[kind] }, (_, index) =>
        makePiece(index, kind, origin, width)
      ).map((piece) => (
        <ConfettiPiece
          key={piece.id}
          piece={piece}
          clock={clock}
          seconds={seconds}
        />
      ))}
    </View>
  );
};
