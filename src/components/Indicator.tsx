import { Text, View, ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import { TAG_COLOR_NAMES } from "@/constants/Config";

export default function Indicator({
  children,
  colorName,
  style
}: {
  children: React.ReactNode,
  colorName: typeof TAG_COLOR_NAMES[number],
  style?: ViewStyle,
}) {
  const colors = useColors();

  return (
    <View style={{
      backgroundColor: colors.tags[colorName]?.background,
      padding: 4,
      paddingLeft: 8,
      paddingRight: 8,
      borderRadius: 6,
      ...style,
    }}>
      <Text style={{
        fontSize: 14,
        color: colors.tags[colorName]?.text,
      }}>
        {children}
      </Text>
    </View>
  )
}
