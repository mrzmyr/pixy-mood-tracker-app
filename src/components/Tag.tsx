import { Pressable, Text, View, ViewStyle } from "react-native";
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

  return (
    <Pressable
      style={({ pressed }) => ({
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
        borderWidth: 2,
        borderColor: selected ? colors.tagBorderActive : colors.tagBorder,
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
        fontWeight: '500',
      }}>{title}</Text>
    </Pressable>
  )
}