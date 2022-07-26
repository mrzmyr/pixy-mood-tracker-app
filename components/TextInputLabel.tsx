import { Text } from "react-native";
import useColors from "../hooks/useColors";

export default function Label({ children }) {
  const colors = useColors()
  
  return <Text
    style={{
      fontSize: 14,
      color: colors.textInputLabel,
      marginTop: 8,
      marginBottom: 4,
      fontWeight: 'bold',
    }}
  >{children}</Text>
}
