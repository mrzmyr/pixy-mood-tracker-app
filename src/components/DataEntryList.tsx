import { View } from "react-native"
import useColors from "@/hooks/useColors"

export default function DataEntyList({ children }) {
  const colors = useColors()

  return (
    <View
      style={{
        backgroundColor: colors.textInputBackground,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 10,
        paddingBottom: 10,
        borderRadius: 8,
      }}
    >
      {children}
    </View>
  )
}