import { Text, View, ViewStyle } from "react-native";
import useColors from "../hooks/useColors";

export default function Indicator({ 
  children, 
  type,
  style
}: {
  children: React.ReactNode,
  type: 'success' | 'error',
  style?: ViewStyle,
}) {
  const colors = useColors();
  
  return (
    <View style={{
      backgroundColor: type === 'success' ? colors.tagSuccessBackground : colors.tagErrorBackground,
      padding: 2,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 8,
      opacity: 0.8,
      ...style,
    }}>
      <Text style={{ 
        fontSize: 14,
        opacity: 0.8,
        color: type === 'success' ? colors.tagSuccessText : colors.tagErrorText,
      }}>
        {children}
      </Text>
    </View>
  )
}
