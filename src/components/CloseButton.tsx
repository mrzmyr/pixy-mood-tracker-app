import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import { X } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** Visible button size; meets the 44 pt minimum touch target. */
const SIZE = 44;
const ICON_SIZE = 24;
const HIT_SLOP = 8;

/**
 * Close button for modal and full-screen pages. Place it top right.
 * Uses the theme text color unless `color` is set, for example white on a
 * photo.
 */
export const CloseButton = ({
  onPress,
  testID,
  color,
  style,
}: {
  onPress: () => void;
  testID?: string;
  /** Icon color override for media backgrounds. */
  color?: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("close")}
      testID={testID}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <X
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={color ?? colors.text}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
};
