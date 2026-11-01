import ImagePlus from "lucide-react-native/icons/image-plus";
import { Pressable } from "react-native";
import { Copy } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";

/**
 * Square dashed tile that starts adding a photo, usually the system photo
 * library picker. Without `size`, the tile fills the width of its parent.
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
        borderColor: colors.textSecondary,
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
        opacity: disabled || pressed ? 0.4 : 1,
      })}
    >
      <ImagePlus color={colors.textSecondary} size={24} />
      <Copy
        size={13}
        numberOfLines={2}
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
