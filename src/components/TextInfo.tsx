import { Text, ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";

export default function TextInfo({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle,
}) {
  const colors = useColors();

  return (
    <Text style={[{
      fontSize: 13,
      color: colors.textSecondary,
      padding: 16,
      paddingTop: 0,
      marginTop: 8,
    }, style]}>{children}</Text>
  )
}