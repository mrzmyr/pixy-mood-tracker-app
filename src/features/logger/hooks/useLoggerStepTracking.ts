import { useEffect, useEffectEvent } from "react";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { useAnalytics } from "@/state/analytics";
import type { LoggerMode } from "../Logger";

/**
 * Send `logger:flow_started` on mount and `logger:step_viewed` on every
 * slide change, with the time since the logger opened.
 */
export const useLoggerStepTracking = ({
  mode,
  steps,
  slideIndex,
  getElapsedMs,
}: {
  mode: LoggerMode;
  steps: LoggerStep[];
  slideIndex: number;
  getElapsedMs: () => number;
}) => {
  const analytics = useAnalytics();

  // Effect events: read the latest slides without re-running the effects
  // below; only mount and slide changes should send events.
  const trackFlowStarted = useEffectEvent(() => {
    analytics.track("logger:flow_started", {
      mode,
      steps_count: steps.length,
    });
  });
  const trackStepViewed = useEffectEvent((index: number) => {
    analytics.track("logger:step_viewed", {
      mode,
      step: steps[index],
      index,
      steps_count: steps.length,
      ms_since_start: getElapsedMs(),
    });
  });

  useEffect(() => {
    trackFlowStarted();
  }, []);

  useEffect(() => {
    trackStepViewed(slideIndex);
  }, [slideIndex]);
};
