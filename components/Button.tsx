import { Pressable, Text } from "react-native";
import Colors from "../constants/Colors";
import useColors from "../hooks/useColors";

export default function Button({ type = 'primary', onPress, children, style = {} }) {
  const colors = useColors()
  
  const buttonColors = {
    primary: {
      background: colors.primaryButtonBackground,
      text: colors.primaryButtonTextColor,
    },
    secondary: {
      background: colors.secondaryButtonBackground,
      text: colors.secondaryButtonTextColor,
    },
  }[type];
  
  return (
    <Pressable
      style={({ pressed }) => [{
        flex: 1,
        marginTop: 20,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        opacity: pressed ? 0.8 : 1,
        backgroundColor: buttonColors?.background,
      }, style]}
      onPress={onPress}
    >
      <Text style={{ fontSize: 16, color: buttonColors?.text }}>{children}</Text>
    </Pressable>
  )
}