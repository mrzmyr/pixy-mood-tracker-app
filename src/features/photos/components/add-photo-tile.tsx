import Plus from "lucide-react-native/icons/plus";
import { Pressable } from "react-native";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";

/**
 * Square gray tile with a plus that starts adding a photo, usually the
 * system photo library picker. The label wraps by word, so long
 * translations break onto more lines inside the side padding. Without `size`, the tile fills the width of its parent.
 */
export const AddPhotoTile = ({
  onPress,
  label = t("photos_add"),
  size,
  disabled,
  testID = "photo-add-tile",
}: {
  onPress: () => void;
  label?: string;
  size?: number;
  disabled?: boolean;
  testID?: string;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => ({
        width: size ?? "100%",
        height: size,
        aspectRatio: 1,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        backgroundColor: colors.chipBackground,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 10,
        opacity: disabled || pressed ? 0.4 : 1,
      })}
    >
      <Plus color={colors.textSecondary} size={28} />
      <Copy
        size={13}
        numberOfLines={3}
        style={{
          color: colors.textSecondary,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {label}
      </Copy>
    </Pressable>
  );
};
