import useColors from "./useColors"
import { SettingsState } from "./useSettings"

export default function useScale(
  type: SettingsState['scaleType']
) {
  const colors = useColors()

  return {
    colors: colors.scales[type],
  }
}
