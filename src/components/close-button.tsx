import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";
import X from "lucide-react-native/icons/x";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";

/** Visible button size; meets the 44 pt minimum touch target. */
const SIZE = 44;
const ICON_SIZE = 24;
const HIT_SLOP = 8;

const getOpacity = (disabled: boolean | undefined, pressed: boolean) => {
  if (disabled) {
    return 0.4;
  }
  return pressed ? 0.7 : 1;
};

/**
 * Icon button of a modal header on Android and web (`HeaderButton`), and the
 * white close button of media overlays (photo viewer, recap stories), which
 * have no header bar. Feature code uses `HeaderButton`.
 * Uses the theme text color unless `color` is set, for example white on a
 * photo.
 */
export const CloseButton = ({
  onPress,
  testID,
  color,
  style,
  accessibilityLabel = t("close"),
  disabled,
}: {
  onPress: () => void;
  testID?: string;
  /** Spoken name. `Cancel` when closing drops edits. */
  accessibilityLabel?: string;
  /** Icon color override for media backgrounds. */
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
}) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
          opacity: getOpacity(disabled, pressed),
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
