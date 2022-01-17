import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";

export default function LinkButton({ type = 'primary', onPress, children, style = {}, icon = null }) {
  const colors = useColors();
  
  const textColor = {
    primary: colors.primaryLinkButtonText,
    secondary: colors.secondaryLinkButtonText,
  }[type];
  
  return (
    <Pressable
      style={({ pressed }) => [{
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        paddingTop: 5,
        paddingBottom: 5,
      }, style]}
      onPress={onPress}
      accessible={true}
    >
      {icon && <View style={{ marginRight: 5 }}>{icon}</View>}
      <Text style={{ fontSize: 17, fontWeight: type === 'primary' ? 'bold' : 'normal', color: textColor }}>{children}</Text>
    </Pressable>
  )
}