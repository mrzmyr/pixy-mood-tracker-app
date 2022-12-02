import { Text, ViewStyle } from "react-native"
import useColors from "@/hooks/useColors"

export default function TextHeadline({
  children,
  style = {},
}: {
  children: React.ReactNode,
  style?: ViewStyle,
}) {
  const colors = useColors()
  return (
    <Text
      style={[{
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.text,
      }, style]}
    >{children}</Text>
  )
}
