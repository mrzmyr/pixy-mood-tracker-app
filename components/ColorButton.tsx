import { Pressable, View } from "react-native";
import { Check } from "react-native-feather";
import { invertColor } from "../lib/utils";

export default function ColorButton({ color, isSelected = false, onPress }) {
  return <Pressable
    onPress={onPress}
    style={{
      padding: 3,
    }}
  >
    <View 
      style={{
        backgroundColor: color,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        height: 35,
        width: 35,
      }}
    >
      {isSelected && <Check color={invertColor(color)} style={{ opacity: 0.7 }} width={14} />}
    </View>
  </Pressable>
}