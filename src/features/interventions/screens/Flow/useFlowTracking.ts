import { useEffect, useEffectEvent, useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import type {
  InterventionFeedback,
  InterventionSurface,
} from "@/state/analytics/events";
import { INTERVENTIONS } from "../../catalog";
import type { InterventionId } from "../../catalog";

interface RunState {
  openedAt: number;
  startedAt: number;
  pauses: number;
  lastStep: number | "intro";
  result: "running" | "completed" | "closed";
  isFeedbackSent: boolean;
}

/**
 * Analytics of one intervention run, all joined by `session`. Sends
 * `intro_viewed` on mount. Unmounting a running flow (system back) sends
 * `flow_abandoned` with `how: "close"`; unmounting the end check without
 * an answer sends `feedback_skipped`. Each end event fires at most once.
 */
export const useFlowTracking = ({
  id,
  surface,
  session,
}: {
  id: InterventionId;
  surface: InterventionSurface;
  session: string;
}) => {
  const analytics = useAnalytics();
  const intervention = INTERVENTIONS[id];
  const ids = { intervention_session_id: session, intervention_id: id };
  const run = useRef<RunState>({
    openedAt: 0,
    startedAt: 0,
    pauses: 0,
    lastStep: "intro",
    result: "running",
    isFeedbackSent: false,
  });

  const abandoned = (how: "close" | "end_early") => {
    const state = run.current;
    if (state.result !== "running") {
      return;
    }
    state.result = "closed";
    analytics.track("interventions:flow_abandoned", {
      ...ids,
      how,
      last_step: state.lastStep,
      total_ms: Date.now() - (state.startedAt || state.openedAt),
      pauses: state.pauses,
    });
  };

  const feedback = (answer: InterventionFeedback | null) => {
    if (run.current.isFeedbackSent) {
      return;
    }
    run.current.isFeedbackSent = true;
    if (answer === null) {
      analytics.track("interventions:feedback_skipped", ids);
    } else {
      analytics.track("interventions:feedback_answered", ids);
    }
  };

  const onMount = useEffectEvent(() => {
    run.current.openedAt = Date.now();
    analytics.track("interventions:intro_viewed", ids);
  });
  const onUnmount = useEffectEvent(() => {
    abandoned("close");
    if (run.current.result === "completed") {
      feedback(null);
    }
  });
  useEffect(() => {
    onMount();
    return () => onUnmount();
  }, []);

  return {
    started: () => {
      const state = run.current;
      state.startedAt = Date.now();
      analytics.track("interventions:flow_started", {
        ...ids,
        intro_ms: state.startedAt - state.openedAt,
        step_count: intervention.steps.length,
      });
    },
    stepViewed: (index: number) => {
      run.current.lastStep = index;
      analytics.track("interventions:step_viewed", {
        ...ids,
        step_index: index,
        step_count: intervention.steps.length,
        step_type: intervention.steps[index].type,
      });
    },
    stepBack: (fromStep: number) => {
      analytics.track("interventions:step_back", {
        ...ids,
        from_step: fromStep,
      });
    },
    pauseChanged: (isPaused: boolean, stepIndex: number) => {
      if (isPaused) {
        run.current.pauses += 1;
      }
      analytics.track(
        isPaused ? "interventions:flow_paused" : "interventions:flow_resumed",
        { ...ids, step_index: stepIndex }
      );
    },
    completed: () => {
      const state = run.current;
      state.result = "completed";
      analytics.track("interventions:flow_completed", {
        ...ids,
        length: intervention.length,
        surface,
        total_ms: Date.now() - state.startedAt,
        expected_ms: intervention.minutes * 60_000,
        pauses: state.pauses,
      });
    },
    abandoned,
    feedback,
  };
};
