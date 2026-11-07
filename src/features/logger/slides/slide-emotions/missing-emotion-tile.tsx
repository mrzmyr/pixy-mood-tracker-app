import Plus from "lucide-react-native/icons/plus";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { CHIP } from "@/constants/chip";

const DEFAULT_STYLE = {};

/**
 * Dashed "Missing one?" pill at the end of an emotion grid. Same size as an
 * emotion chip; opens the request sheet.
 */
export const MissingEmotionTile = ({
  onPress,
  style = DEFAULT_STYLE,
}: {
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("request_emotion_title")}
      testID="request-emotion"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: CHIP.height,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.tint,
        paddingHorizontal: CHIP.paddingLeft,
        opacity: pressed ? 0.6 : 1,
        ...style,
      })}
    >
      <Plus size={18} color={colors.tint} />
      <Label
        size={16}
        numberOfLines={1}
        style={{ fontWeight: "500", color: colors.tint }}
      >
        {t("request_emotion_tile")}
      </Label>
    </Pressable>
  );
};
