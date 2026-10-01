import { useEffect, useEffectEvent } from "react";
import { useAnalytics } from "@/state/analytics";
import type { LoggerStep } from "../config";
import type { LoggerMode } from "../Logger";

/** Sends `logger:flow_started` on mount and `logger:step_viewed` per slide. */
export const useLoggerTracking = ({
  mode,
  slideKeys,
  slideIndex,
}: {
  mode: LoggerMode;
  slideKeys: LoggerStep[];
  slideIndex: number;
}) => {
  const analytics = useAnalytics();

  // Effect event: reads the latest slides without re-running the effects
  // below; only mount and slide changes should send events.
  const trackFlowStarted = useEffectEvent(() => {
    analytics.track("logger:flow_started", {
      mode,
      steps_count: slideKeys.length,
    });
  });
  const trackStepViewed = useEffectEvent((index: number) => {
    analytics.track("logger:step_viewed", {
      mode,
      step: slideKeys[index],
      index,
      steps_count: slideKeys.length,
    });
  });

  useEffect(() => {
    trackFlowStarted();
  }, []);

  useEffect(() => {
    trackStepViewed(slideIndex);
  }, [slideIndex]);
};
