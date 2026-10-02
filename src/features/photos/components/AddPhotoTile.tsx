import { ImagePlus } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Square dashed tile that starts adding a photo. Usually opens
 * {@link showAddPhotoMenu}. Without `size`, the tile fills the width of its
 * parent.
 */
export const AddPhotoTile = ({
  onPress,
  label = t("photos_add"),
  size,
  disabled,
}: {
  onPress: () => void;
  label?: string;
  size?: number;
  disabled?: boolean;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID="photo-add-tile"
      style={({ pressed }) => ({
        width: size ?? "100%",
        height: size,
        aspectRatio: 1,
        borderRadius: 12,
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
      <Text
        numberOfLines={2}
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};
