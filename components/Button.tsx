import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";
import LoadingIndicator from "./LoadingIndicator";

export default function Button({ 
  type = 'primary', 
  icon,
  onPress, 
  isLoading = false,
  children, 
  style = {} 
}: {
  type?: 'primary' | 'secondary',
  icon?: React.ReactNode,
  isLoading?: boolean,
  children: React.ReactNode,
  style?: any,
  onPress?: () => void,
}) {
  const colors = useColors()
  
  const buttonColors = {
    primary: {
      border: colors.primaryButtonBorder,
      background: colors.primaryButtonBackground,
      text: colors.primaryButtonTextColor,
    },
    secondary: {
      border: colors.secondaryButtonBorder,
      background: colors.secondaryButtonBackground,
      text: colors.secondaryButtonTextColor,
    },
  }[type];
  
  return (
    <Pressable
      style={({ pressed }) => [{
        padding: 12,
        paddingRight: 15,
        paddingLeft: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderRadius: 5,
        opacity: isLoading ? 0.5 : (pressed ? 0.8 : 1),
        backgroundColor: buttonColors?.background,
        borderWidth: 1,
        borderColor: buttonColors?.border,
      }, style]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <LoadingIndicator size={20} color={buttonColors?.text} />
      ) : (
        <>
        {icon && <View style={{ marginRight: children ? 10 : 0 }}>{icon}</View>}
        <Text style={{ fontSize: 17, color: buttonColors?.text }}>{children}</Text>
        </>
      )}
    </Pressable>
  )
}