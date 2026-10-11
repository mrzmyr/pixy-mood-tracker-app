import { useEffect, useEffectEvent } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import Button from "@/components/Button";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { INTERVENTIONS } from "../../catalog";
import type { InterventionId, InterventionStep } from "../../catalog";
import { getBreathTotalMs } from "./breathPhase";
import { BreathView } from "./BreathView";
import { PromptView } from "./PromptView";
import { TimedView } from "./TimedView";
import { useCountdown } from "./useCountdown";

const getStepMs = (step: InterventionStep) => {
  if (step.type === "breath") {
    return getBreathTotalMs(step);
  }
  return (step.type === "timed" ? step.sec : step.minSec) * 1000;
};

/** Stable segment key: prompts and timed parts have keys, breath steps are unique per flow. */
const getStepKey = (step: InterventionStep) =>
  step.type === "breath" ? "breath" : step.key;

const getSegmentFill = (segment: number, index: number, fill: number) => {
  if (segment < index) {
    return 1;
  }
  return segment === index ? fill : 0;
};

/**
 * One step with its progress bar and buttons. Mount with `key={index}`, so
 * the countdown restarts per step. Breathing and timed steps move on at
 * zero; prompts only fill the bar as a pacing hint. Leaving the app pauses
 * timers.
 */
export const StepStage = ({
  id,
  index,
  isPaused,
  onPauseChange,
  onNext,
  onBack,
  onEndEarly,
}: {
  id: InterventionId;
  index: number;
  isPaused: boolean;
  onPauseChange: (isPaused: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onEndEarly: () => void;
}) => {
  const colors = useColors();
  const { steps } = INTERVENTIONS[id];
  const step = steps[index];
  const stepMs = getStepMs(step);
  const isTimer = step.type !== "prompt";
  const remainingMs = useCountdown({
    durationMs: stepMs,
    isPaused: isTimer && isPaused,
    onDone: isTimer ? onNext : undefined,
  });

  const pauseOnBackground = useEffectEvent(() => {
    if (isTimer && !isPaused) {
      onPauseChange(true);
    }
  });
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        pauseOnBackground();
      }
    });
    return () => subscription.remove();
  }, []);

  const fill = 1 - remainingMs / stepMs;
  const isSingleStep = steps.length === 1;

  return (
    <View style={{ flex: 1 }}>
      {!isSingleStep && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: 4, marginTop: 8 }}
        >
          {steps.map((segmentStep, segment) => (
            <View
              key={getStepKey(segmentStep)}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: colors.stepperBackground,
              }}
            >
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.stepperBackgroundActive,
                  width: `${getSegmentFill(segment, index, fill) * 100}%`,
                }}
              />
            </View>
          ))}
        </View>
      )}

      <View style={{ flex: 1, justifyContent: "center", paddingVertical: 16 }}>
        {step.type === "breath" && (
          <BreathView
            step={step}
            remainingMs={remainingMs}
            isPaused={isPaused}
          />
        )}
        {step.type === "timed" && (
          <TimedView
            id={id}
            step={step}
            index={index}
            count={steps.length}
            remainingMs={remainingMs}
          />
        )}
        {step.type === "prompt" && (
          <PromptView id={id} step={step} index={index} count={steps.length} />
        )}
      </View>

      {step.type === "prompt" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {index > 0 && (
            <Button
              testID="intervention-back"
              type="secondary"
              style={{ flex: 1 }}
              onPress={onBack}
            >
              {t("interventions_back")}
            </Button>
          )}
          <Button
            testID="intervention-next"
            style={{ flex: 2 }}
            onPress={onNext}
          >
            {t("interventions_next")}
          </Button>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              testID="intervention-pause"
              type="secondary"
              style={{ flex: 1 }}
              onPress={() => onPauseChange(!isPaused)}
            >
              {isPaused ? t("interventions_resume") : t("interventions_pause")}
            </Button>
            <Button
              testID={
                isSingleStep
                  ? "intervention-end-early"
                  : "intervention-skip-step"
              }
              type="tertiary"
              style={{ flex: 1 }}
              onPress={isSingleStep ? onEndEarly : onNext}
            >
              {isSingleStep
                ? t("interventions_end_early")
                : t(
                    step.type === "timed"
                      ? "interventions_next_part"
                      : "interventions_skip_step"
                  )}
            </Button>
          </View>
          {!isSingleStep && (
            <Pressable
              testID="intervention-end-early"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onEndEarly}
              style={{ alignSelf: "center", padding: 12 }}
            >
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>
                {t("interventions_end_early")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
