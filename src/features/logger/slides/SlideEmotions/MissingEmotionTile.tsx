import { Plus } from "lucide-react-native";
import { Pressable, Text, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/Radius";

const DEFAULT_STYLE = {};

/**
 * Dashed "Missing one?" cell at the end of an emotion grid. Same size as an
 * emotion button; opens the request sheet.
 */
export const MissingEmotionTile = ({
  onPress,
  style = DEFAULT_STYLE,
}: {
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const borderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("request_emotion_title")}
      testID="request-emotion"
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: RADIUS.sm,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor,
        paddingVertical: 11.5,
        paddingHorizontal: 14,
        opacity: pressed ? 0.6 : 1,
        ...style,
      })}
    >
      <Plus size={18} color={colors.textSecondary} />
      <Text
        numberOfLines={1}
        style={{ fontSize: 17, fontWeight: "500", color: colors.textSecondary }}
      >
        {t("request_emotion_tile")}
      </Text>
    </Pressable>
  );
};
