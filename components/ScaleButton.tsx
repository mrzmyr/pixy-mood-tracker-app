import chroma from "chroma-js";
import { Pressable, Text, useColorScheme } from "react-native";
import { Check } from "react-native-feather";

export default function ScaleButton({
  backgroundColor,
  textColor,
  isSelected = false,
  accessibilityLabel,
  isFirst = false,
  isLast = false,
  onPress,
}: {
  backgroundColor: string,
  textColor: string;
  isSelected?: boolean,
  accessibilityLabel?: string,
  isFirst?: boolean,
  isLast?: boolean,
  onPress: () => void,
}) {
  let colorScheme = useColorScheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        borderColor: colorScheme === 'light' ?
          chroma(backgroundColor).darken(0.4).hex() :
          chroma(backgroundColor).brighten(0.5).hex(),
        backgroundColor: backgroundColor,
        opacity: pressed ? 0.8 : 1,
        flex: 7,
        borderRadius: 8,
        width: '100%',
        aspectRatio: 1,
        marginLeft: isFirst ? 0 : 4,
        marginRight: isLast ? 0 : 4,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
      }]}
      testID={`scale-button-${accessibilityLabel}`}
      accessibilityLabel={accessibilityLabel}
      accessible={true}
    >
      {
        isSelected ?
          <Check color={textColor} width={24} /> :
          <Text>&nbsp;</Text>
      }
    </Pressable>
  )
}