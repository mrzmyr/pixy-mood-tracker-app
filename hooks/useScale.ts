import useColors from "./useColors"
import { RATING_KEYS } from "./useLogs"
import { SettingsState } from "./useSettings"

export default function useScale(
  type: SettingsState['scaleType']
) {
  const colors = useColors()

  const scaleColors = {}
  RATING_KEYS.forEach((label, index) => {
    scaleColors[label] = colors.scales[type][label]
  })

  return {
    colors: scaleColors,
    labels: RATING_KEYS
  }
}
