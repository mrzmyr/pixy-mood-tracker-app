import { View } from "react-native";
import { LogItem } from "../hooks/useLogs";
import useScale from "../hooks/useScale";
import { SettingsState } from "../hooks/useSettings";
import ScaleButton from "./ScaleButton";

export default function Scale({
  type,
  value,
  onPress = null,
}: {
  type: SettingsState['scaleType'];
  value?: LogItem['rating'];
  onPress?: null | ((key: string) => void),
}) {
  const { colors } = useScale(type)
  
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Object.keys(colors).reverse().map(key => (
        <ScaleButton 
          key={key} 
          isSelected={key === value}
          onPress={onPress ? () => onPress(key) : null}
          color={colors[key].background}
        />
      ))}
    </View>
  )
}
