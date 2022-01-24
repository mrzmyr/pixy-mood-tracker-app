import { StyleProp, Text } from "react-native";
import useColors from "../hooks/useColors";

export default function TextInfo({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<Text>;
}) {
  const colors = useColors();
  
  return (
    <Text style={[{
      fontSize: 14,
      color: colors.textSecondary,
      padding: 15,
      paddingTop: 0,
      marginTop: 10,
    }, style]}>{children}</Text>
  )
}