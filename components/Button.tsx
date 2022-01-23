import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";

export default function Button({ 
  type = 'primary', 
  icon,
  onPress, 
  children, 
  style = {} 
}: {
  type?: 'primary' | 'secondary',
  icon?: React.ReactNode,
  onPress?: () => void,
  children: React.ReactNode,
  style?: any
}) {
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
        padding: 10,
        paddingRight: 15,
        paddingLeft: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderRadius: 5,
        opacity: pressed ? 0.8 : 1,
        backgroundColor: buttonColors?.background,
      }, style]}
      onPress={onPress}
    >
      {icon && <View style={{ marginRight: children ? 10 : 0 }}>{icon}</View>}
      <Text style={{ fontSize: 16, color: buttonColors?.text }}>{children}</Text>
    </Pressable>
  )
}