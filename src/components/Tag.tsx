import { Pressable, Text, View, ViewStyle, useColorScheme } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { TAG_COLOR_NAMES } from "@/constants/Config";

export default function Tag({
  title,
  selected = false,
  colorName,
  onPress,
  style = {},
}: {
  title: string,
  selected?: boolean,
  colorName: typeof TAG_COLOR_NAMES[number],
  onPress?: () => void,
  style?: ViewStyle
}) {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();

  return (
    <Pressable
      style={({ pressed }) => ({
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? colors.tagBackgroundActive : colors.tagBackground,
        borderColor: selected ? colors.tint : colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        borderWidth: selected ? 2 : 1,
        paddingLeft: selected ? 15 : 16,
        paddingRight: selected ? 15 : 16,
        paddingTop: selected ? 7 : 8,
        paddingBottom: selected ? 7 : 8,
        opacity: pressed ? 0.8 : 1,
        ...style,
      })}
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
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Text style={{
        color: selected ? colors.tagTextActive : colors.tagText,
        fontSize: 17,
      }}>{title}</Text>
    </Pressable>
  )
}