import { Text } from "react-native";
import useColors from "@/hooks/useColors";

export default function TextInputLabel({ children }) {
  const colors = useColors()

  return <Text
    style={{
      fontSize: 17,
      color: colors.textInputLabel,
      marginTop: 16,
      marginBottom: 8,
      fontWeight: 'bold',
    }}
  >{children}</Text>
}
