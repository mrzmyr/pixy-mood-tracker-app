import type { RecapCardProperties } from "@/state/analytics/events";
import { CARD_TYPES } from "./card-types";
import type { Period, RecapCard } from "./types";

/** Event properties of `card`. Card meta only, never values shown on it. */
export const getCardProperties = (
  card: RecapCard,
  period: Period
): RecapCardProperties => {
  const meta = CARD_TYPES[card.type];
  return {
    card_type: card.type,
    family: meta.family,
    modules: meta.modules,
    signal: meta.signal,
    period: period.kind,
    source: "settings",
  };
};
