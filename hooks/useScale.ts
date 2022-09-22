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

  const scaleColors = {}
  labels.forEach((label, index) => {
    scaleColors[label] = colors.scales[type][label]
  })

  return {
    colors: scaleColors,
    labels
  }
}
