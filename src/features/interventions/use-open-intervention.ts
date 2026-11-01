import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { useAnalytics } from "@/state/analytics";
import type { InterventionSurface } from "@/state/analytics/events";
import { INTERVENTIONS } from "./catalog";
import type { InterventionId } from "./catalog";

/** Route parameters of `/interventions/[id]`. */
// oxlint-disable-next-line typescript/consistent-type-definitions -- Expo Router params need an index signature; interfaces have none.
export type InterventionRouteParams = {
  id: InterventionId;
  surface: InterventionSurface;
  session: string;
};

/**
 * Open an intervention flow. Sends `interventions:option_selected` with a
 * new session id; the flow screen sends every later event with it.
 *
 * `replace` swaps the current modal (logger) for the flow, so closing the
 * flow returns to the screen below the logger.
 */
export const useOpenIntervention = () => {
  const router = useRouter();
  const analytics = useAnalytics();

  return ({
    id,
    surface,
    position,
    completedToday,
    navigation,
  }: {
    id: InterventionId;
    surface: InterventionSurface;
    position: number;
    completedToday: InterventionId[];
    navigation: "push" | "replace";
  }) => {
    const session = uuidv4();
    const intervention = INTERVENTIONS[id];
    analytics.track("interventions:option_selected", {
      intervention_session_id: session,
      intervention_id: id,
      length: intervention.length,
      surface,
      option_position: position,
      repeat_today: completedToday.includes(id),
    });
    const params: InterventionRouteParams = { id, surface, session };
    router[navigation]({ pathname: "/interventions/[id]", params });
  };
};
