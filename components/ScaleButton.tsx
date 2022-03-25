import { Pressable, Text } from "react-native";
import { Check } from "react-native-feather";
import { invertColor } from "../lib/utils";

export default function ScaleButton({ 
  color, 
  isSelected = false, 
  accessibilityLabel,
  isFirst = false,
  isLast = false,
  onPress,
}: {
  color: string,
  isSelected?: boolean,
  accessibilityLabel?: string,
  isFirst?: boolean,
  isLast?: boolean,
  onPress: () => void,
}) {
  return <Pressable
    onPress={onPress}
    style={{
      backgroundColor: color,
      flex: 1,
      borderTopLeftRadius: isFirst ? 5 : 0,
      borderBottomLeftRadius: isFirst ? 5 : 0,
      borderTopRightRadius: isLast ? 5 : 0,
      borderBottomRightRadius: isLast ? 5 : 0,
      width: '100%',
      aspectRatio: 1,
      marginTop: 5,
      marginBottom: 5,
      marginLeft: isFirst ? 0 : 0,
      marginRight: isLast ? 0 : 0,
      justifyContent: 'center',
      alignItems: 'center',
      // maxWidth: 50,
    }}
    testID={`scale-button-${accessibilityLabel}`}
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