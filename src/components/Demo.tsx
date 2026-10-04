import { useState } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import { PageModalLayout } from "@/components/PageModalLayout";
import { Secondary, Title } from "@/components/Type";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** Inactive dots are circles. The active mark is this many times as wide. */
const ACTIVE_DOT_SCALE = 3;
const DOT_SIZE = 6;
const DOT_MOVE_MS = 200;
/** Keeps the dots clear of the 44pt close control without shifting their center. */
const DOT_LANE_INSET = 44;

/** One screen in a {@link Demo}. */
export interface DemoStep {
  /** Heading for this step. */
  readonly title: string;
  /** Paragraph under the heading. */
  readonly body: string;
  /** Visual aligned to the same horizontal inset as the text. */
  readonly content: React.ReactNode;
}

/** Button copy for {@link Demo}. Last step shows `done` instead of `next`. */
export interface DemoLabels {
  /** Advances to the next step. */
  readonly next: string;
  /** Shown on the last step. */
  readonly done: string;
}

const StepDot = ({ active }: { active: boolean }) => {
  const colors = useColors();

  return (
    <Animated.View
      layout={LinearTransition.duration(DOT_MOVE_MS).reduceMotion(
        ReduceMotion.System
      )}
      style={{
        width: active ? DOT_SIZE * ACTIVE_DOT_SCALE : DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: active
          ? colors.stepperBackgroundActive
          : colors.stepperBackground,
      }}
    />
  );
};

const StepDots = ({ step, count }: { step: number; count: number }) => (
  <View
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel={t("demo_step_progress", { step, total: count })}
    accessibilityValue={{ min: 1, max: count, now: step }}
    style={{
      alignItems: "center",
      paddingHorizontal: DOT_LANE_INSET,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <StepDot key={index} active={index === step - 1} />
      ))}
    </View>
  </View>
);

const getTestId = ({ prefix, name }: { prefix?: string; name: string }) => {
  if (!prefix) {
    return;
  }

  return `${prefix}-${name}`;
};

const getEntering = ({ isReducedMotion }: { isReducedMotion: boolean }) => {
  if (isReducedMotion) {
    return;
  }

  return FadeIn.duration(300);
};

/**
 * Full-screen demo. Close sits top right, step dots stay centered, and the
 * title, body, and visual share one horizontal inset.
 *
 * Step numbers are 1-based. Close is the only way out before the last step.
 */
export const Demo = ({
  steps,
  labels,
  testID,
  onDismiss,
  onComplete,
  onStepChange,
}: {
  steps: readonly DemoStep[];
  labels: DemoLabels;
  /** Prefix for close, title, and next test IDs. */
  testID?: string;
  onDismiss: ({ step }: { step: number }) => void;
  onComplete: () => void;
  onStepChange?: ({ step }: { step: number }) => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const current = steps[step - 1];
  const isLast = step === steps.length;

  if (!current) {
    return null;
  }

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }

    const nextStep = step + 1;
    setStep(nextStep);
    onStepChange?.({ step: nextStep });
  };

  return (
    <PageModalLayout style={{ backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ height: 44, justifyContent: "center" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingLeft: 12,
            }}
          >
            <StepDots step={step} count={steps.length} />
          </View>
          <CloseButton
            testID={getTestId({ prefix: testID, name: "close" })}
            onPress={() => onDismiss({ step })}
            style={{ position: "absolute", right: 0, top: 0 }}
          />
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16 }}>
        <Animated.View
          key={step}
          entering={getEntering({ isReducedMotion: isReducedMotion === true })}
          style={{ flex: 1, minHeight: 0, paddingTop: 8 }}
        >
          <Title
            accessibilityRole="header"
            testID={getTestId({ prefix: testID, name: "title" })}
            style={{ textAlign: "left" }}
          >
            {current.title}
          </Title>
          {/* Two lines reserved, so the visual keeps its size across steps. */}
          <Secondary
            style={{
              textAlign: "left",
              marginTop: 8,
              minHeight: 40,
            }}
          >
            {current.body}
          </Secondary>
          <View
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: 24,
              overflow: "hidden",
            }}
          >
            {current.content}
          </View>
        </Animated.View>
        <View
          style={{
            paddingTop: 24,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Button
            testID={getTestId({ prefix: testID, name: "next" })}
            onPress={goNext}
          >
            {isLast ? labels.done : labels.next}
          </Button>
        </View>
      </View>
    </PageModalLayout>
  );
};
