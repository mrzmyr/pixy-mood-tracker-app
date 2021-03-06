import { Text, View } from "react-native";
import useColors from "../hooks/useColors";

export default function Tag({ 
  children, 
  type 
}: {
  children: React.ReactNode,
  type: 'success' | 'error',
}) {
  const colors = useColors();
  
  return (
    <View style={{
      backgroundColor: type === 'success' ? colors.tagSuccessBackground : colors.tagErrorBackground,
      padding: 2,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 5,
      opacity: 0.8,
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
