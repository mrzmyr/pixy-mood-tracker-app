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
  onPress?: any,
}) {
  const { colors } = useScale(type)
  
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {Object.keys(colors).reverse().map((key, index) => (
        <ScaleButton 
          key={key} 
          isFirst={index === 0}
          isSelected={key === value}
          onPress={onPress ? () => onPress(key) : null}
          color={colors[key].background}
        />
      ))}
    </View>
  )
}
