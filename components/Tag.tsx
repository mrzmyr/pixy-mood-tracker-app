import { Text, TouchableOpacity } from "react-native";
import useColors from "../hooks/useColors";

export default function Tag({ 
  colorName,
  title,
  selected = false,
  onPress,
}: {
  colorName: string,
  title: string,
  selected?: boolean,
  onPress?: () => void,
}) {
  const colors = useColors();
  
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        marginRight: 4,
        marginBottom: 4,
        backgroundColor: selected ? colors.tags[colorName]?.text : colors.tags[colorName]?.background,
      }}
      onPress={onPress}
    >
      <Text style={{
        color: selected ? colors.tags[colorName]?.background : colors.tags[colorName]?.text,
        fontSize: 17,
      }}>{title}</Text>
    </TouchableOpacity>
  )
}
