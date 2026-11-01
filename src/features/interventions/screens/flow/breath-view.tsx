import { useEffect, useEffectEvent } from "react";
import { Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Copy, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { BreathStep } from "../../catalog";
import { getBreathPhase, getBreathTotalMs } from "./breath-phase";

const SIZE = 220;
const SMALL = 0.55;

/**
 * Breathing circle: grows on inhale, shrinks on exhale, with phase name,
 * seconds left, and round. Reduced motion fades instead of scaling.
 */
export const BreathView = ({
  step,
  remainingMs,
  isPaused,
}: {
  step: BreathStep;
  remainingMs: number;
  isPaused: boolean;
}) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const elapsedMs = getBreathTotalMs(step) - remainingMs;
  const { phase, cycle, phaseLeftMs } = getBreathPhase(step, elapsedMs);
  const progress = useSharedValue(SMALL);

  // Phases alternate, so each change restarts the animation. On resume it
  // runs for the time left in the phase.
  const getPhaseLeftMs = useEffectEvent(() => phaseLeftMs);
  useEffect(() => {
    if (isPaused) {
      cancelAnimation(progress);
      return;
    }
    progress.set(
      withTiming(phase === "in" ? 1 : SMALL, {
        duration: isReducedMotion ? 300 : getPhaseLeftMs(),
        easing: Easing.inOut(Easing.sin),
      })
    );
  }, [phase, isPaused, isReducedMotion, progress]);

  const circleStyle = useAnimatedStyle(() =>
    isReducedMotion
      ? { opacity: progress.get(), transform: [{ scale: 0.8 }] }
      : { transform: [{ scale: progress.get() }] }
  );

  const label = {
    ready: t("interventions_get_ready"),
    in: t("interventions_breathe_in"),
    out: t("interventions_breathe_out"),
  }[phase];

  return (
    <View style={{ alignItems: "center", gap: 28 }}>
      {step.isClosing && (
        <Copy size={14} style={{ color: colors.textSecondary }}>
          {t("interventions_closing_breaths")}
        </Copy>
      )}
      <View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 2,
            borderColor: colors.stepperBackground,
          }}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              backgroundColor: colors.primaryButtonBackground,
            },
            circleStyle,
          ]}
        />
        <View accessibilityLiveRegion="polite" style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.primaryButtonText,
            }}
          >
            {label}
          </Text>
          <Label
            size={16}
            style={{
              color: colors.primaryButtonText,
              fontVariant: ["tabular-nums"],
              minHeight: 22,
            }}
          >
            {phase === "ready"
              ? ""
              : Math.max(1, Math.ceil(phaseLeftMs / 1000))}
          </Label>
        </View>
      </View>
      <Label
        size={14}
        style={{
          color: colors.textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {t("interventions_round", { current: cycle + 1, total: step.cycles })}
      </Label>
    </View>
  );
};
