import { Text, TextStyle } from "react-native";
import useColors from "@/hooks/useColors";

export default function MenuListHeadline({
  children,
  style = {},
}: {
  children: React.ReactNode,
  style?: TextStyle
}) {
  const colors = useColors();

  return (
    <Text style={{
      fontSize: 14,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      padding: 0,
      borderRadius: 8,
      width: '100%',
      marginTop: 32,
      paddingLeft: 16,
      marginBottom: 8,
      ...style,
    }}>
      {children}
    </Text>
  )
}