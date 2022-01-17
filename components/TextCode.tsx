import { Platform, Text } from "react-native"
import useColors from "../hooks/useColors"

export default function TextCode({ style = {}, children }) {
  const colors = useColors()
  const fontFamily = Platform.OS === 'ios' ? 'Courier New' : 'monospace'
  return (
    <Text
      style={[style, { fontFamily, color: colors.text }]}
    >
      {children}
    </Text>
  )
}