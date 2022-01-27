import { Pressable, Text } from "react-native";
import { Check } from "react-native-feather";
import { invertColor } from "../lib/utils";

export default function ScaleButton({ 
  color, 
  isSelected = false, 
  accessibilityLabel,
  onPress,
}: {
  color: string,
  isSelected?: boolean,
  accessibilityLabel?: string,
  onPress: () => void,
}) {
  return <Pressable
    onPress={onPress}
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
      maxWidth: 50,
    }}
    accessibilityLabel={accessibilityLabel}
    accessible={true}
  >
    {
      isSelected ? 
      <Check color={invertColor(color)} style={{ opacity: 0.8 }} width={24} /> : 
      <Text>&nbsp;</Text>
    }
  </Pressable>
}