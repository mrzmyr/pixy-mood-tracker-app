import { Text } from "react-native";
import useColors from "../hooks/useColors";

export default function TextInfo({ children }) {
  const colors = useColors();
  
  return (
    <Text style={{
      fontSize: 14,
      color: colors.textSecondary,
      padding: 15,
      paddingTop: 0,
      marginTop: 10,
    }}>{children}</Text>
  )
}