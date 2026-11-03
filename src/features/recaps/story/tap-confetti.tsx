import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

// Physics of canvas-confetti (github.com/catdad/canvas-confetti), solved in
// closed form so one clock drives every piece. Units: points and 60 Hz frames.
const FRAME_MS = 1000 / 60;
/** Frames until a piece is gone. */
const TICKS = 170;
const COUNT = 60;
/** Launch cone around straight up, in degrees. */
const SPREAD = 70;
const START_VELOCITY = 32;
/** Share of velocity kept per frame: air drag. */
const DECAY = 0.9;
/** Fall per frame. Constant, so pieces drift down like paper, not stones. */
const GRAVITY = 1;
/** Radius of the side-to-side flutter. */
const WOBBLE = 6;

const COLORS = [
  "#26CCFF",
  "#A25AFD",
  "#FF5E7E",
  "#88FF5A",
  "#FCFF42",
  "#FFA62D",
  "#FF36FF",
];

interface Piece {
  id: number;
  angle: number;
  velocity: number;
  drift: number;
  wobble: number;
  wobbleSpeed: number;
  tilt: number;
  tiltSpeed: number;
  spin: number;
  width: number;
  height: number;
  isRound: boolean;
  color: string;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

const makePieces = (): Piece[] =>
  Array.from({ length: COUNT }, (_, index) => {
    const size = between(6, 9);
    return {
      id: index,
      // Straight up is -90°.
      angle: ((-90 + between(-SPREAD / 2, SPREAD / 2)) * Math.PI) / 180,
      velocity: START_VELOCITY * between(0.5, 1),
      drift: between(-0.3, 0.3),
      wobble: between(0, Math.PI * 2),
      wobbleSpeed: between(0.05, 0.11),
      tilt: between(0, Math.PI * 2),
      tiltSpeed: between(0.08, 0.16),
      spin: between(-6, 6),
      width: size,
      height: index % 3 === 0 ? size : size * 0.55,
      isRound: index % 5 === 0,
      color: COLORS[index % COLORS.length] ?? "#26CCFF",
    };
  });

const ConfettiPiece = ({
  piece,
  ms,
}: {
  piece: Piece;
  ms: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const frame = ms.get() / FRAME_MS;
    // Sum of a velocity that decays by DECAY each frame.
    const travel = (piece.velocity * (1 - DECAY ** frame)) / (1 - DECAY);
    const wobble = piece.wobble + piece.wobbleSpeed * frame;
    const x =
      Math.cos(piece.angle) * travel +
      piece.drift * frame +
      WOBBLE * Math.cos(wobble);
    const y =
      Math.sin(piece.angle) * travel +
      GRAVITY * frame +
      WOBBLE * Math.sin(wobble);
    const life = Math.min(1, frame / TICKS);
    return {
      opacity: life < 0.7 ? 1 : 1 - (life - 0.7) / 0.3,
      transform: [
        { translateX: x },
        { translateY: y },
        { perspective: 300 },
        { rotateZ: `${piece.spin * frame}deg` },
        // Paper flipping in the air.
        { rotateX: `${piece.tilt + piece.tiltSpeed * frame}rad` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -piece.width / 2,
          top: -piece.height / 2,
          width: piece.width,
          height: piece.height,
          borderRadius: piece.isRound ? piece.width / 2 : 1,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
};

/**
 * Confetti burst from `x`, `y`: the point the user tapped. Pieces shoot up
 * in a cone, slow down in the air, flutter, and drift down while they fade.
 * Plays once on mount. Mount a new one per burst. Callers skip it with
 * reduced motion.
 */
export const TapConfetti = ({ x, y }: { x: number; y: number }) => {
  // New random pieces per burst.
  const pieces = useMemo(() => makePieces(), []);
  const ms = useSharedValue(0);
  useEffect(() => {
    ms.set(
      withTiming(TICKS * FRAME_MS, {
        duration: TICKS * FRAME_MS,
        easing: Easing.linear,
      })
    );
  }, [ms]);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y }}
    >
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} ms={ms} />
      ))}
    </View>
  );
};
