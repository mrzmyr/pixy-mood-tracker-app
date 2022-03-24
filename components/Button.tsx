import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";
import LoadingIndicator from "./LoadingIndicator";
import useHaptics from "../hooks/useHaptics";

export default function Button({ 
  type = 'primary', 
  icon,
  testID,
  onPress, 
  isLoading = false,
  children, 
  style = {},
}: {
  type?: 'primary' | 'secondary',
  icon?: React.ReactNode,
  testID?: string,
  isLoading?: boolean,
  children: React.ReactNode,
  style?: React.CSSProperties,
  onPress?: () => void,
}) {
  const colors = useColors()
  const haptics = useHaptics()
  
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
        padding: 12,
        paddingRight: 15,
        paddingLeft: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderRadius: 5,
        opacity: isLoading ? 0.5 : (pressed ? 0.8 : 1),
        backgroundColor: buttonColors?.background,
      }, style]}
      onPress={async () => {
        await haptics.selection()
        onPress()
      }}
      disabled={isLoading}
      testID={testID}
      accessibilityRole={'button'}
    >
      {isLoading ? (
        <LoadingIndicator size={20} color={buttonColors?.text} />
      ) : (
        <>
        {icon && <View style={{ marginRight: children ? 10 : 0 }}>{icon}</View>}
        <Text style={{ fontSize: 17, color: buttonColors?.text }} numberOfLines={1}>{children}</Text>
        </>
      )}
    </Pressable>
  )
}