import { useEffect, useEffectEvent } from "react";
import { useAnalytics } from "@/state/analytics";
import type { AnalyticsEvents } from "@/state/analytics/events";

/**
 * Send `interventions:card_shown` once per mount and cluster. `null` sends
 * nothing, for example when no emotion matched.
 */
export const useCardShown = (
  properties: AnalyticsEvents["interventions:card_shown"] | null
) => {
  const analytics = useAnalytics();
  const key = properties ? properties.cluster : null;
  const send = useEffectEvent(() => {
    if (properties) {
      analytics.track("interventions:card_shown", properties);
    }
  });

  useEffect(() => {
    if (key !== null) {
      send();
    }
  }, [key]);
};
