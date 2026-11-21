// Feature flags as the capture sees them.
import { FEATURE_FLAGS } from "../../src/state/feature-flags/keys.ts";
import type { FeatureFlag } from "../../src/state/feature-flags/keys.ts";

export {
  FEATURE_FLAGS,
  FEATURE_FLAG_DETAILS,
} from "../../src/state/feature-flags/keys.ts";
export type { FeatureFlag } from "../../src/state/feature-flags/keys.ts";

/**
 * Flags that never apply a local override: `feature-flag-overrides` is the
 * override gate itself, `app-lock-bypass` reads the remote value only.
 */
const NOT_OVERRIDABLE = new Set<FeatureFlag>([
  "feature-flag-overrides",
  "app-lock-bypass",
]);

/** Flags the flags-on pass turns on, sorted. */
export const OVERRIDABLE_FLAGS: FeatureFlag[] = FEATURE_FLAGS.filter(
  (flag) => !NOT_OVERRIDABLE.has(flag)
).toSorted();
