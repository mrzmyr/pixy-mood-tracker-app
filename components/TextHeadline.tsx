import { Text } from "react-native"
import useColors from "../hooks/useColors"

export default function TextHeadline({ 
  children, 
  style = null,
}: {
  children: React.ReactNode,
  style?: any,
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
