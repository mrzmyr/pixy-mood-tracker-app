import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";

const BAR_COUNT = 28;
const BAR_WIDTH = 3;
const BAR_GAP = 3;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 36;
// New sample every 90 ms: about 2.5 s of history across the bars.
const SAMPLE_MS = 90;
// Fixed slots: bar n always shows the n-th newest sample.
const SLOT_KEYS = Array.from({ length: BAR_COUNT }, (_, slot) => `bar-${slot}`);

const Bar = ({
  value,
  color,
}: {
  value: SharedValue<number>;
  color: string;
}) => {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY:
          MIN_HEIGHT / MAX_HEIGHT + value.get() * (1 - MIN_HEIGHT / MAX_HEIGHT),
      },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          height: MAX_HEIGHT,
          borderRadius: RADIUS.full,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

const SampleBar = ({ sample, color }: { sample: number; color: string }) => {
  const value = useSharedValue(sample);
  useEffect(() => {
    value.set(withTiming(sample, { duration: SAMPLE_MS }));
  }, [sample, value]);
  return <Bar value={value} color={color} />;
};

/**
 * Scrolling waveform of the live input level. Newest sample on the right.
 * Bars scale on the UI thread; JavaScript only shifts samples. Paused: the
 * bars hold still.
 */
export const VoiceWaveform = ({
  getLevel,
  isActive,
  color,
}: {
  /** Latest input level, 0 to 1. */
  getLevel: () => number;
  isActive: boolean;
  color: string;
}) => {
  const [samples, setSamples] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0)
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const id = setInterval(() => {
      setSamples((current) => [...current.slice(1), getLevel()]);
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [isActive, getLevel]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: BAR_GAP,
        height: MAX_HEIGHT,
      }}
    >
      {SLOT_KEYS.map((slotKey, slot) => (
        <SampleBar key={slotKey} sample={samples[slot] ?? 0} color={color} />
      ))}
    </View>
  );
};
