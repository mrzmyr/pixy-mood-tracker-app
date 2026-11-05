import { useFeatureFlag } from "@/state/feature-flags";
import type { CheckInType } from "@/types";

/**
 * Check-in type that shapes the logger: steps and prompts. While flag
 * `check-in-types` is off, returns `undefined`, so the logger behaves as
 * before the feature. Never changes the stored value: entries keep their
 * type through flag changes, edits, exports, and imports.
 */
export const useActiveCheckInType = (
  checkInType: CheckInType | undefined
): CheckInType | undefined => {
  const isEnabled = useFeatureFlag("check-in-types");
  return isEnabled ? checkInType : undefined;
};
