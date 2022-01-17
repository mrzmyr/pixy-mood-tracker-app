import { Pressable, Text, View } from "react-native";
import { Check } from "react-native-feather";
import { invertColor } from "../lib/utils";

export default function ColorButton({ color, isSelected = false, onPress }) {
  return <Pressable
    onPressIn={onPress}
    style={{
      padding: 3,
      backgroundColor: color,
      flex: 1,
      borderRadius: 5,
      width: '100%',
      aspectRatio: 1,
      margin: 5,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    accessible={true}
  >
    {isSelected ? <Check color={invertColor(color)} style={{ opacity: 0.8 }} width={24} /> : <Text>&nbsp;</Text>}
  </Pressable>
}