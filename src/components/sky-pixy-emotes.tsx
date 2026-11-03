import { useEffect, useEffectEvent, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path } from "react-native-svg";
import { CLOUD_PIXY_SIZE } from "@/components/cloud-pixy";

/** One emote rises this long, then it is gone. */
const RISE_MS = 1300;
/** Time between two emotes per joy level 1 to 4. Level 0 sends none. */
const EVERY_MS = [0, 500, 320, 200, 120];

/** Emotes of one cheer. */
const BURST = 14;
const HEART = "#F472B6";
const SPARKLE = "#FDE68A";

interface Emote {
  id: number;
  kind: "heart" | "sparkle";
  x: number;
  y: number;
  /** Sideways travel while it rises, in points. */
  drift: number;
  /** Height it rises, in points. */
  rise: number;
  size: number;
}

const HEART_PATH =
  "M12 21s-7.5-4.6-10-9.3C.4 8.6 2.3 4.5 6.2 4.5c2.3 0 3.9 1.3 5.8 3.5 1.9-2.2 3.5-3.5 5.8-3.5 3.9 0 5.8 4.1 4.2 7.2C19.5 16.4 12 21 12 21z";
const SPARKLE_PATH =
  "M12 1 Q13.6 10.4 23 12 Q13.6 13.6 12 23 Q10.4 13.6 1 12 Q10.4 10.4 12 1 Z";

/** Heart or sparkle that rises from Pixy, grows a little, and fades out. */
const RisingEmote = ({
  emote,
  onDone,
}: {
  emote: Emote;
  onDone: (id: number) => void;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withTiming(
        1,
        { duration: RISE_MS, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            scheduleOnRN(onDone, emote.id);
          }
        }
      )
    );
  }, [progress, onDone, emote.id]);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [
        { translateX: emote.x - emote.size / 2 + emote.drift * p },
        { translateY: emote.y - emote.size / 2 - emote.rise * p },
        { scale: 0.5 + 0.6 * p },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <Svg width={emote.size} height={emote.size} viewBox="0 0 24 24">
        <Path
          d={emote.kind === "heart" ? HEART_PATH : SPARKLE_PATH}
          fill={emote.kind === "heart" ? HEART : SPARKLE}
        />
      </Svg>
    </Animated.View>
  );
};

/**
 * Hearts and sparkles that rise from cloud Pixy at `x`, `y`: more the higher
 * `joy` (0 to 1), and a burst on every new `cheers` count. Decoration only:
 * no touches, no screen reader.
 */
export const SkyPixyEmotes = ({
  x,
  y,
  level,
  cheers,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Joy level from `getJoyLevel`: 0 sends none, 4 the most. */
  level: number;
  cheers: SharedValue<number>;
}) => {
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const nextId = useRef(0);

  const spawn = (count: number) => {
    const cx = x.get();
    const top = y.get() - CLOUD_PIXY_SIZE * 0.3;
    const added = Array.from({ length: count }, (): Emote => {
      nextId.current += 1;
      return {
        id: nextId.current,
        kind: Math.random() < 0.6 ? "heart" : "sparkle",
        x: cx + (Math.random() - 0.5) * CLOUD_PIXY_SIZE * 0.6,
        y: top,
        drift: (Math.random() - 0.5) * 50,
        rise: 50 + Math.random() * 50,
        size: 14 + Math.random() * 12,
      };
    });
    setEmotes((current) => [...current, ...added]);
  };
  const spawnOne = useEffectEvent(() => spawn(1));

  useEffect(() => {
    const every = EVERY_MS[level] ?? 0;
    if (every === 0) {
      return;
    }
    spawnOne();
    const timer = setInterval(spawnOne, every);
    return () => clearInterval(timer);
  }, [level]);

  const burst = () => spawn(BURST);
  useAnimatedReaction(
    () => cheers.get(),
    (current, previous) => {
      if (previous !== null && current > previous) {
        scheduleOnRN(burst);
      }
    }
  );

  const remove = (id: number) =>
    setEmotes((current) => current.filter((emote) => emote.id !== id));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {emotes.map((emote) => (
        <RisingEmote key={emote.id} emote={emote} onDone={remove} />
      ))}
    </View>
  );
};
