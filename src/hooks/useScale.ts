import { IScale } from '@/constants/Colors/Scales';
import useColors from "./useColors";
import { RATING_KEYS } from "./useLogs";
import { SettingsState, useSettings } from "./useSettings";

export default function useScale(
  type?: SettingsState['scaleType']
) {
  const colors = useColors()
  const { settings } = useSettings()

  const _type = type || settings.scaleType

  const scaleColors = {} as IScale
  RATING_KEYS.forEach((label, index) => {
    scaleColors[label] = colors.scales[_type][label]
  })

  return {
    colors: scaleColors,
    labels: RATING_KEYS
  }
}
