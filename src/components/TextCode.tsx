import { Platform, Text } from "react-native"
import useColors from "@/hooks/useColors"

const fontFamily = Platform.OS === 'ios' ? 'Courier New' : 'monospace'

export default function TextCode({
  children,
  style = null,
}: {
  children: React.ReactNode,
  style?: any,
}) {
  const colors = useColors()

  return (
    <Text
      style={[{ fontFamily, color: colors.text, fontWeight: 'bold' }, style]}
    >
      {children}
    </Text>
  )
}