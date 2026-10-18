import type { IScale } from "@/constants/colors/scales";
import useColors from "@/hooks/use-colors";
import { RATING_KEYS } from "@/constants/ratings";
import type { SettingsState } from "@/state/settings";

/**
 * Mood colors for the user's scale, or for `type` when given.
 *
 * Only rating keys are filled; `colors.empty` is not set.
 */
export default function useScale(type: SettingsState["scaleType"]) {
  const colors = useColors();

  // SAFETY: the loop below assigns every rating key; callers never read `empty` from this map.
  const scaleColors = {} as IScale;
  for (const label of RATING_KEYS) {
    scaleColors[label] = colors.scales[type][label];
  }

  return {
    colors: scaleColors,
    labels: RATING_KEYS,
  };
}
