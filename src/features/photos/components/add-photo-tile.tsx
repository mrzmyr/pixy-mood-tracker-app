import ImagePlus from "lucide-react-native/icons/image-plus";
import { Pressable } from "react-native";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";

/**
 * Square dashed tile that starts adding a photo, usually the system photo
 * library picker. Soft border; the label wraps by word, so long
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
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.addPhotoTileBorder,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        paddingHorizontal: 10,
        opacity: disabled || pressed ? 0.4 : 1,
      })}
    >
      <ImagePlus color={colors.textSecondary} size={28} />
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
