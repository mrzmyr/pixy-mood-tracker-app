import { Pressable } from "react-native";
import Plus from "lucide-react-native/icons/plus";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { HOME_LAYOUT } from "../layout";

// Measured: 18 pt glyph, about 1.8 pt stroke. Lucide draws plus on 14 of 24.
const ICON_SIZE = 30;
const ICON_STROKE = 1.5;

/**
 * Add entry capsule: white with a hairline ring and a soft shadow, like the
 * reference. `HomeView` floats it above the tab bar.
 */
export const HomeAddButton = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();
  const size = HOME_LAYOUT.buttonSize;

  return (
    <Pressable
      testID="home-add-entry"
      accessibilityRole="button"
      accessibilityLabel={t("add_entry")}
      onPress={onPress}
      style={({ pressed }) => ({
        width: HOME_LAYOUT.addWidth,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.calendarBackground,
        borderWidth: 1,
        borderColor: colors.homeDivider,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Plus
        size={ICON_SIZE}
        color={colors.textSecondary}
        strokeWidth={ICON_STROKE}
      />
    </Pressable>
  );
};
