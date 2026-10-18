import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { DIAL_MAX, DIAL_MIN } from "./emotion-affect";

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 8;
// Accessibility actions move by one eighth of the range.
const A11Y_STEP = 0.5;
const STEP = 0.1;

const clampRound = (value: number) => {
  "worklet";
  const clamped = Math.min(DIAL_MAX, Math.max(DIAL_MIN, value));
  return Math.round(clamped / STEP) * STEP;
};

/**
 * One dial of the dials picker: a horizontal slider from {@link DIAL_MIN} to
 * {@link DIAL_MAX}. Tap the track to jump, drag the thumb to move. The pan
 * starts at once, so it wins over the logger's slide swipe. VoiceOver and
 * TalkBack adjust it with swipe up and down.
 */
export const EmotionDial = ({
  testID,
  label,
  valueText,
  lowLabel,
  highLabel,
  gradient,
  value,
  onChange,
}: {
  testID: string;
  label: string;
  /** Spoken and shown value, for example "High". */
  valueText: string;
  lowLabel: string;
  highLabel: string;
  gradient: readonly [string, string, ...string[]];
  value: number;
  onChange: (value: number) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const [width, setWidth] = useState(0);
  const trackWidth = useSharedValue(0);
  const position = useSharedValue(value);
  const lastSent = useSharedValue(value);

  // Accessibility actions and presets move the thumb from outside.
  useEffect(() => {
    position.set(value);
    lastSent.set(value);
  }, [value, position, lastSent]);

  const onTouch = (x: number) => {
    "worklet";
    const w = trackWidth.get();
    if (w === 0) {
      return;
    }
    const next = DIAL_MIN + (x / w) * (DIAL_MAX - DIAL_MIN);
    position.set(Math.min(DIAL_MAX, Math.max(DIAL_MIN, next)));
    const rounded = clampRound(next);
    if (rounded !== lastSent.get()) {
      lastSent.set(rounded);
      scheduleOnRN(onChange, rounded);
    }
  };

  const gesture = usePanGesture({
    minDistance: 0,
    maxPointers: 1,
    onBegin: (event) => onTouch(event.x),
    onUpdate: (event) => onTouch(event.x),
    onDeactivate: () => scheduleOnRN(haptics.selection),
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          ((position.get() - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) *
            trackWidth.get() -
          THUMB_SIZE / 2,
      },
    ],
  }));

  const adjust = (delta: number) => {
    const next = clampRound(value + delta);
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        adjust(
          event.nativeEvent.actionName === "increment" ? A11Y_STEP : -A11Y_STEP
        )
      }
      style={{ paddingVertical: 6 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {valueText}
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={{
            height: THUMB_SIZE,
            justifyContent: "center",
            marginHorizontal: THUMB_SIZE / 2,
          }}
          onLayout={(event) => {
            const w = event.nativeEvent.layout.width;
            trackWidth.set(w);
            setWidth(w);
          }}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2 }}
          />
          {width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: colors.logCardBackground,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.1)",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                },
                thumbStyle,
              ]}
            />
          )}
        </View>
      </GestureDetector>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          {lowLabel}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
          {highLabel}
        </Text>
      </View>
    </View>
  );
};
