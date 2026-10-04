import { Pressable, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { getPhotoFile } from "../storage";
import { TileImage } from "./TileImage";

/**
 * Square photo tile of a stored entry photo, radius 12. Shows a
 * placeholder when the file is missing or unreadable, for example after an
 * import from another device. Never removes the reference itself.
 *
 * Without `size`, the tile fills the width of its parent.
 */
export const PhotoThumbnail = ({
  photo,
  index,
  count,
  size,
  onPress,
}: {
  photo: LogPhoto;
  /** Position in the entry, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size?: number;
  onPress?: () => void;
}) => {
  const colors = useColors();
  const position = index + 1;

  return (
    <View style={{ width: size ?? "100%", aspectRatio: 1 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "imagebutton" : "image"}
        accessibilityLabel={t("photos_thumbnail_label", {
          index: position,
          count,
        })}
        testID={`photo-thumbnail-${position}`}
        style={{
          flex: 1,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: colors.backgroundSecondary,
        }}
      >
        {/* No `file.exists` check: it is synchronous file I/O on every
            render. A missing file fails to load and shows the placeholder. */}
        <TileImage uri={getPhotoFile(photo).uri} recyclingKey={photo.id} />
      </Pressable>
    </View>
  );
};
