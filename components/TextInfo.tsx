import { Text } from "react-native";
import useColors from "../hooks/useColors";

export default function TextInfo({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any,
}) {
  const colors = useColors();
  
  return (
    <Text style={[{
      fontSize: 13,
      color: colors.textSecondary,
      padding: 16,
      paddingTop: 0,
      marginTop: 10,
    }, style]}>{children}</Text>
  )
}