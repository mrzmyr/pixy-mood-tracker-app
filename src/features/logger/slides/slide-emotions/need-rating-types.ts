import type { NeedState } from "./needs";

/** Props shared by the iOS, Android, and fallback need rating. */
export interface NeedRatingProps {
  /** Need name, for the accessibility label. */
  label: string;
  /** Rating of the need. Unrated shows no selected segment. */
  state?: NeedState;
  onChange: (state: NeedState) => void;
  testID?: string;
}

/**
 * Segment order, left to right: unmet, partly, met. Same order as the
 * xmark-to-checkmark rows in health journals.
 */
export const RATING_ORDER = [
  "unmet",
  "partly",
  "met",
] as const satisfies readonly NeedState[];

/** Translation key of each state, for the segment accessibility label. */
export const RATING_LABELS = {
  met: "log_needs_met",
  partly: "log_needs_partly",
  unmet: "log_needs_unmet",
} as const satisfies Record<NeedState, string>;
