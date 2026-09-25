import type { IScale } from "@/constants/Colors/Scales";
import useColors from "./useColors";
import { RATING_KEYS } from "@/constants/Ratings";
import type { SettingsState } from "./useSettings";
import { useSettings } from "./useSettings";

export default function useScale(type?: SettingsState["scaleType"]) {
  const colors = useColors();
  const { settings } = useSettings();

  const _type = type || settings.scaleType;

  // SAFETY: the loop below assigns every rating key; callers never read `empty` from this map.
  const scaleColors = {} as IScale;
  for (const label of RATING_KEYS) {
    scaleColors[label] = colors.scales[_type][label];
  }

  return {
    colors: scaleColors,
    labels: RATING_KEYS,
  };
}
