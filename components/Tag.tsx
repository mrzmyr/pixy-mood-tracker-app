import { Text, TouchableOpacity, View } from "react-native";
import useColors from "../hooks/useColors";
import useHaptics from "../hooks/useHaptics";

export default function Tag({ 
  title,
  selected = false,
  colorName,
  onPress,
}: {
  title: string,
  selected?: boolean,
  colorName: string,
  onPress?: () => void,
}) {
  const colors = useColors();
  const haptics = useHaptics();
  
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
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? colors.tagBackgroundActive : colors.tagBackground,
        borderWidth: 1,
        borderColor: selected ? colors.tagBorderActive : colors.tagBorder,
      }}
      onPress={async () => {
        await haptics.selection();
        onPress?.();
      }}
    >
      <View 
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          marginRight: 10,
          backgroundColor: colors.tags[colorName].dot,
        }}
      />
      <Text style={{
        color: selected ? colors.tagTextActive : colors.tagText,
        fontSize: 17,
      }}>{title}</Text>
    </TouchableOpacity>
  )
}