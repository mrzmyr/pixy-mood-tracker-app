import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import useColors from "@/hooks/use-colors";
import { useSettings } from "@/state/settings";

const PIECE = 7;
const COUNT = 14;
const BURST_MS = 1100;
/** Drop at the end of the burst, in points. */
const FALL = 36;

const RATINGS = [
  "extremely_good",
  "very_good",
  "good",
  "neutral",
  "very_good",
  "extremely_good",
  "good",
] as const;

/** Where each piece flies: a ring around the tap, a little wider than high. */
const PIECES = Array.from({ length: COUNT }, (_, index) => {
  const angle = (index / COUNT) * Math.PI * 2 + 0.2;
  const distance = index % 2 === 0 ? 64 : 42;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.8,
    rotate: (index % 3) * 120 + 90,
    rating: RATINGS[index % RATINGS.length] ?? "good",
  };
});

const Piece = ({
  piece,
  progress,
  color,
}: {
  piece: (typeof PIECES)[number];
  progress: SharedValue<number>;
  color: string;
}) => {
  const style = useAnimatedStyle(() => {
    const share = progress.get();
    return {
      opacity: share < 0.6 ? 1 : 1 - (share - 0.6) / 0.4,
      transform: [
        { translateX: piece.x * share },
        { translateY: piece.y * share + FALL * share * share },
        { rotate: `${piece.rotate * share}deg` },
        { scale: 0.4 + 0.6 * Math.min(1, share * 2) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -PIECE / 2,
          top: -PIECE / 2,
          width: PIECE,
          height: PIECE,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

/**
 * Small burst of mood-colored pixels from `x`, `y`: the point the user
 * tapped. Plays once on mount, eased, then fades. Mount a new one per burst.
 * Callers skip it with reduced motion.
 */
export const TapConfetti = ({ x, y }: { x: number; y: number }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [progress]);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y }}
    >
      {PIECES.map((piece, index) => (
        <Piece
          // oxlint-disable-next-line react/no-array-index-key -- fixed list, never reorders
          key={index}
          piece={piece}
          progress={progress}
          color={scale[piece.rating].background}
        />
      ))}
    </View>
  );
};
