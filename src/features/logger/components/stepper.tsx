import { View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

const DOT_SIZE = 6;
const ACTIVE_DOT_SCALE = 3;
const DOT_MOVE_MS = 200;

const StepDot = ({ active }: { active: boolean }) => {
  const colors = useColors();
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(active ? DOT_SIZE * ACTIVE_DOT_SCALE : DOT_SIZE, {
      duration: DOT_MOVE_MS,
      reduceMotion: ReduceMotion.System,
    }),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: active
            ? colors.stepperBackgroundActive
            : colors.stepperBackground,
        },
      ]}
    />
  );
};

/**
 * Progress dots: active step expands into a pill. `onBack` adds a `Back`
 * accessibility action, the screen reader way to undo the swipe.
 */
export const Stepper = ({
  count,
  index,
  onBack,
}: {
  count: number;
  index: number;
  onBack?: () => void;
}) => (
  <View
    accessible
    accessibilityRole="progressbar"
    accessibilityActions={
      onBack ? [{ name: "back", label: t("logger_back") }] : undefined
    }
    onAccessibilityAction={(event) => {
      if (event.nativeEvent.actionName === "back") {
        onBack?.();
      }
    }}
    accessibilityLabel={t("logger_step_progress", {
      step: index + 1,
      total: count,
    })}
    accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    testID="logger-stepper"
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    }}
  >
    {Array.from({ length: count }, (_, step) => (
      <StepDot key={step} active={step === index} />
    ))}
  </View>
);
