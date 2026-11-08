import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

const BAR_COUNT = 28;
const BAR_WIDTH = 3;
const BAR_GAP = 3;
const STEP = BAR_WIDTH + BAR_GAP;
/** Silence: a round dot as wide as the bar. */
const MIN_HEIGHT = BAR_WIDTH;
const MAX_HEIGHT = 36;
// New sample every 90 ms: about 2.5 s of history across the bars.
const SAMPLE_MS = 90;
// One extra bar slides in from the right while the row scrolls.
const SLOT_KEYS = Array.from(
  { length: BAR_COUNT + 1 },
  (_, slot) => `bar-${slot}`
);

const Bar = ({
  slot,
  samples,
  color,
}: {
  slot: number;
  samples: SharedValue<number[]>;
  color: string;
}) => {
  const style = useAnimatedStyle(() => ({
    // Height, not scale: scaling would squash the round ends.
    height: MIN_HEIGHT + (samples.get()[slot] ?? 0) * (MAX_HEIGHT - MIN_HEIGHT),
  }));
  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

/**
 * Scrolling waveform of the live input level, newest sample on the right.
 * Runs on the UI thread: the row slides left one bar per sample, so it
 * scrolls smoothly at frame rate instead of jumping. Bars keep round ends;
 * silence shows as dots. Paused: the bars hold still.
 */
export const VoiceWaveform = ({
  level,
  isActive,
  color,
}: {
  /** Live input level, 0 to 1. */
  level: SharedValue<number>;
  isActive: boolean;
  color: string;
}) => {
  const samples = useSharedValue<number[]>(
    Array.from({ length: BAR_COUNT + 1 }, () => 0)
  );
  // Time since the last sample, 0 to SAMPLE_MS.
  const sinceSample = useSharedValue(0);

  const frame = useFrameCallback(({ timeSincePreviousFrame }) => {
    let since = sinceSample.get() + (timeSincePreviousFrame ?? 0);
    if (since >= SAMPLE_MS) {
      since %= SAMPLE_MS;
      const next = samples.get().slice(1);
      next.push(level.get());
      samples.set(next);
    }
    sinceSample.set(since);
  }, false);

  useEffect(() => {
    frame.setActive(isActive);
  }, [frame, isActive]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(sinceSample.get() / SAMPLE_MS) * STEP }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: BAR_COUNT * STEP - BAR_GAP,
        height: MAX_HEIGHT,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: BAR_GAP,
            height: MAX_HEIGHT,
          },
          rowStyle,
        ]}
      >
        {SLOT_KEYS.map((slotKey, slot) => (
          <Bar key={slotKey} slot={slot} samples={samples} color={color} />
        ))}
      </Animated.View>
    </View>
  );
};
