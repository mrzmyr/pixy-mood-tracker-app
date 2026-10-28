import { Pressable, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { getPhotoFile } from "../storage";
import { TileImage } from "./tile-image";
import { RADIUS } from "@/constants/radius";

/**
 * Photo tile of a stored entry photo, radius 12, square by default. Shows a
 * placeholder when the file is missing or unreadable, for example after an
 * import from another device. Never removes the reference itself.
 *
 * Without `size`, the tile fills the width of its parent.
 *
 * Inside a `PhotoGalleryItem` the native viewer handles the tap: pass
 * `onScreenReaderOpen` instead of `onPress`. A screen reader activation
 * calls it, not the native tap.
 */
export const PhotoThumbnail = ({
  photo,
  index,
  count,
  size,
  aspectRatio = 1,
  onPress,
  onScreenReaderOpen,
}: {
  photo: LogPhoto;
  /** Position in the entry, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size?: number;
  /** Width divided by height. The image covers the tile and crops. */
  aspectRatio?: number;
  onPress?: () => void;
  onScreenReaderOpen?: () => void;
}) => {
  const colors = useColors();
  const position = index + 1;
  const canOpen = !!onPress || !!onScreenReaderOpen;

  return (
    <View style={{ width: size ?? "100%", aspectRatio }}>
      <Pressable
        onPress={onPress}
        disabled={!canOpen}
        accessibilityRole={canOpen ? "imagebutton" : "image"}
        accessibilityActions={
          onScreenReaderOpen ? [{ name: "activate" }] : undefined
        }
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate") {
            onScreenReaderOpen?.();
          }
        }}
        accessibilityLabel={t("photos_thumbnail_label", {
          index: position,
          count,
        })}
        testID={`photo-thumbnail-${position}`}
        style={{
          flex: 1,
          borderRadius: RADIUS.md,
          borderCurve: "continuous",
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
