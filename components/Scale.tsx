import { View } from "react-native";
import { LogItem } from "../hooks/useLogs";
import useScale from "../hooks/useScale";
import { SettingsState } from "../hooks/useSettings";
import ScaleButton from "./ScaleButton";
import * as Haptics from 'expo-haptics';

export default function Scale({
  type,
  value,
  onPress = null,
}: {
  type: SettingsState['scaleType'];
  value?: LogItem['rating'];
  onPress?: any,
}) {
  let { colors, labels } = useScale(type)
  labels = labels.reverse()
  
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
          accessibilityLabel={labels[index]}
          key={key} 
          isFirst={index === 0}
          isSelected={key === value}
          onPress={onPress ? async () => {
            await Haptics.selectionAsync()
            onPress(key) 
          }: null}
          color={colors[key].background}
        />
      ))}
    </View>
  )
}
