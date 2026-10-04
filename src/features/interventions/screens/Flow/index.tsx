import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type {
  InterventionFeedback,
  InterventionSurface,
} from "@/state/analytics/events";
import { INTERVENTIONS } from "../../catalog";
import type { InterventionId } from "../../catalog";
import { markCompleted } from "../../completed";
import { EndCheckView } from "./EndCheckView";
import { IntroView } from "./IntroView";
import { StepStage } from "./StepStage";
import { useFlowTracking } from "./useFlowTracking";

type Stage =
  | { kind: "intro" }
  | { kind: "step"; index: number }
  | { kind: "done" };

/** Pause on the picked answer so the user sees it before the flow closes. */
const CLOSE_DELAY_MS = 450;

/**
 * Full-screen guided intervention: intro, one step at a time, then "How do
 * you feel compared to before?". No typing; nothing the user thinks is
 * stored. Closing early, by button or system back, counts as abandoned.
 */
export const InterventionFlow = ({
  id,
  surface,
  session,
}: {
  id: InterventionId;
  surface: InterventionSurface;
  session: string;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tracking = useFlowTracking({ id, surface, session });
  const { steps } = INTERVENTIONS[id];
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState<InterventionFeedback | null>(null);

  const goStep = (index: number) => {
    if (index >= steps.length) {
      tracking.completed();
      void markCompleted(id);
      setStage({ kind: "done" });
      return;
    }
    setIsPaused(false);
    setStage({ kind: "step", index });
    tracking.stepViewed(index);
  };

  const close = (how: "close" | "end_early") => {
    tracking.abandoned(how);
    router.back();
  };

  useEffect(() => {
    if (feedback === null) {
      return;
    }
    const timeout = setTimeout(() => router.back(), CLOSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [feedback, router]);

  return (
    <View
      testID="intervention-flow"
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        // The iOS page sheet already sits below the status bar.
        paddingTop: 8 + (Platform.OS === "android" ? insets.top : 0),
        paddingBottom: insets.bottom + 8,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 44,
          marginHorizontal: -12,
        }}
      >
        <Pressable
          testID="intervention-close"
          accessibilityRole="button"
          accessibilityLabel={t("interventions_close")}
          onPress={() => close("close")}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={24} color={colors.text} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          {stage.kind === "step" ? t(`interventions_${id}_title`) : ""}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {stage.kind === "intro" && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 16 }}
          >
            <IntroView intervention={INTERVENTIONS[id]} />
          </ScrollView>
          <Button
            testID="intervention-start"
            onPress={() => {
              tracking.started();
              goStep(0);
            }}
          >
            {t("interventions_start")}
          </Button>
        </>
      )}

      {stage.kind === "step" && (
        <StepStage
          key={stage.index}
          id={id}
          index={stage.index}
          isPaused={isPaused}
          onPauseChange={(value) => {
            setIsPaused(value);
            tracking.pauseChanged(value, stage.index);
          }}
          onNext={() => goStep(stage.index + 1)}
          onBack={() => {
            tracking.stepBack(stage.index);
            goStep(stage.index - 1);
          }}
          onEndEarly={() => close("end_early")}
        />
      )}

      {stage.kind === "done" && (
        <EndCheckView
          selected={feedback}
          onAnswer={(answer) => {
            tracking.feedback(answer);
            setFeedback(answer);
          }}
          onSkip={() => {
            tracking.feedback(null);
            router.back();
          }}
        />
      )}
    </View>
  );
};
