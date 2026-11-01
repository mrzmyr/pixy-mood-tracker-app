import { useEffect, useEffectEvent } from "react";
import { useAnalytics } from "@/state/analytics";
import type {
  AnalyticsEvents,
  InterventionCluster,
} from "@/state/analytics/events";

/**
 * Send `interventions:card_shown` once per mount and cluster. A `null`
 * cluster sends nothing, for example when no emotion matched. The cluster
 * stays on the device: it tells which emotions the user logged.
 */
export const useCardShown = (
  cluster: InterventionCluster | null,
  properties: AnalyticsEvents["interventions:card_shown"]
) => {
  const analytics = useAnalytics();
  const send = useEffectEvent(() => {
    analytics.track("interventions:card_shown", properties);
  });

  useEffect(() => {
    if (cluster !== null) {
      send();
    }
  }, [cluster]);
};
