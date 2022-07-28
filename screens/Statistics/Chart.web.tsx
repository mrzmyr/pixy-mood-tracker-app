import { useColorScheme, View } from "react-native";
import useColors from "../../hooks/useColors";
import useScale from "../../hooks/useScale";
import { useSettings } from "../../hooks/useSettings";
import { getValueFromRating } from "../../lib/Statistics";

export const Chart = ({
  data,
  formatDate,
  yValues
}) => {
  const { settings } = useSettings()
  const colors = useColors()
  const scale = useScale(settings.scaleType)
  const scheme = useColorScheme()
  
  return (
    <View
      style={{
      }}
    >
    </View>
  )
}