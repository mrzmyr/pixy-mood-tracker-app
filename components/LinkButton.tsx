import { Pressable, Text, View } from "react-native";
import useColors from "../hooks/useColors";
import * as Haptics from 'expo-haptics';

export default function LinkButton({ 
  type = 'primary', 
  onPress, 
  children, 
  style = {}, 
  icon = null,
  testID,
}: {
  type?: 'primary' | 'secondary',
  onPress: () => any,
  children: React.ReactNode,
  style?: any,
  icon?: React.ReactNode,
  testID?: string,
}) {
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
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
      }, style]}
      onPress={async () => {
        await Haptics.selectionAsync()
        onPress()
      }}
      testID={testID}
    >
      {icon && <View style={{ marginRight: 5 }}>{icon}</View>}
      <Text 
        ellipsizeMode='tail' 
        numberOfLines={1}
        style={{ 
          fontSize: 17, 
          fontWeight: type === 'primary' ? 'bold' : 'normal', 
          color: textColor,
          textAlign: 'center',
        }}
      >{children}</Text>
    </Pressable>
  )
}