import { View } from "react-native";
import useHaptics from "@/hooks/useHaptics";
import { LogItem } from "@/hooks/useLogs";
import useScale from "@/hooks/useScale";
import { SettingsState } from "@/hooks/useSettings";
import ScaleButton from "./ScaleButton";

export default function Scale({
  type,
  value,
  onPress = null,
}: {
  type: SettingsState['scaleType'];
  value?: LogItem['rating'] | LogItem['rating'][];
  onPress?: any,
}) {
  let { colors, labels } = useScale(type)
  const _labels = labels.slice().reverse()
  const haptics = useHaptics()

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {Object.keys(colors).reverse().map((key, index) => {

        const isSelected = Array.isArray(value) ?
          value.includes(key as LogItem['rating']) :
          value === key

        return (
          <ScaleButton
            accessibilityLabel={_labels[index]}
            key={key}
            isFirst={index === 0}
            isLast={index === _labels.length - 1}
            isSelected={isSelected}
            onPress={async () => {
              if (onPress) {
                await haptics.selection()
                onPress(key)
              }
            }}
            backgroundColor={colors[key].background}
            textColor={colors[key].text}
          />
        );
      })}
    </View>
  )
}
