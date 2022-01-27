import useColors from "./useColors"
import { SettingsState } from "./useSettings"

export default function useScale(
  type: SettingsState['scaleType']
) {
  const colors = useColors()
  const labels = [
    'extremely_good',
    'very_good',
    'good',
    'neutral',
    'bad',
    'very_bad',
    'extremely_bad',
  ]

  return {
    colors: colors.scales[type],
    labels
  }
}
