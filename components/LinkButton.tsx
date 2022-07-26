import { Pressable, PressableProps, Text, TextProps, View } from "react-native";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";

export default function LinkButton({ 
  type = 'primary', 
  onPress, 
  children, 
  style = {}, 
  textStyle = {},
  icon = null,
  testID,
}: {
  type?: 'primary' | 'secondary',
  onPress: () => any,
  children?: React.ReactNode,
  style?: PressableProps['style'],
  textStyle?: TextProps['style'],
  icon?: React.ReactNode,
  testID?: string,
}) {
  const colors = useColors();
  const haptics = useHaptics();
  
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
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 8,
      }, style]}
      onPress={async () => {
        await haptics.selection()
        onPress()
      }}
      testID={testID}
    >
      {icon && <View style={{ marginRight: 5 }}>{icon}</View>}
      {children &&
        <Text 
          ellipsizeMode='tail' 
          numberOfLines={1}
          style={{ 
            fontSize: 17, 
            fontWeight:'normal', 
            color: textColor,
            textAlign: 'center',
            ...textStyle,
          }}
        >{children}</Text>
      }
    </Pressable>
  )
}