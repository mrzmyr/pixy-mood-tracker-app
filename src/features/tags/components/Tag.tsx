import type { ViewStyle } from "react-native";
import { Pressable, Text, View, useColorScheme } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import type { TAG_COLOR_NAMES } from "@/constants/Config";

const DEFAULT_STYLE = {};

const Tag = ({
  title,
  selected = false,
  colorName,
  onPress,
  style = DEFAULT_STYLE,
}: {
  title: string;
  selected?: boolean;
  colorName: (typeof TAG_COLOR_NAMES)[number];
  onPress?: () => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      style={({ pressed }) => ({
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        borderRadius: 100,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        borderColor: selected ? colors.tint : unselectedBorderColor,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
        opacity: pressed && onPress ? 0.8 : 1,
        ...style,
      })}
      onPress={async () => {
        if (!onPress) {
          return;
        }
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
      <Text
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: 17,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

export default Tag;
