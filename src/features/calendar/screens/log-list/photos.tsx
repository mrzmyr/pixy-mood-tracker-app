import { useRouter } from "expo-router";
import Image from "lucide-react-native/icons/image";
import { Pressable, ScrollView } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import {
  IS_PHOTO_GALLERY_SUPPORTED,
  PhotoGallery,
  PhotoGalleryItem,
  PhotoThumbnail,
} from "@/features/photos";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import { RADIUS } from "@/constants/radius";
import { INSET } from "./layout";

const THUMBNAIL_SIZE = 96;

/**
 * Photos of an entry card as one scrollable row. Each thumbnail opens the
 * viewer. With the photos flag on, the native viewer (`PhotoGallery`) opens:
 * the photo grows from its tile. Web, reduce motion, screen readers, and
 * flag off open `PhotoViewer` through `/photos/[id]`. With `onEdit`, a
 * dashed tile at the end opens the logger at the photos step. Without
 * photos it renders nothing; the add pills offer the step instead.
 */
export const Photos = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const router = useRouter();
  const isPhotosEnabled = useFeatureFlag("photos");
  // Galeria animates the photo out of the tile and has no reduce motion
  // option. The route viewer fades instead.
  const isReducedMotion = useReducedMotion();
  const hasGallery =
    isPhotosEnabled && IS_PHOTO_GALLERY_SUPPORTED && !isReducedMotion;
  const { photos } = item;

  if (photos.length === 0) {
    return null;
  }

  const open = (index: number) => {
    router.push({
      pathname: "/photos/[id]",
      params: { id: item.id, index: String(index) },
    });
  };

  const row = (
    <ScrollView
      testID="log-list-photos"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: INSET }}
    >
      {photos.map((photo, index) =>
        hasGallery ? (
          <PhotoGalleryItem key={photo.id} index={index}>
            <PhotoThumbnail
              photo={photo}
              index={index}
              count={photos.length}
              size={THUMBNAIL_SIZE}
              onScreenReaderOpen={() => open(index)}
            />
          </PhotoGalleryItem>
        ) : (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            count={photos.length}
            size={THUMBNAIL_SIZE}
            onPress={() => open(index)}
          />
        )
      )}
      {onEdit && (
        <Pressable
          testID="log-list-photos-edit"
          accessibilityRole="button"
          accessibilityLabel={t("view_log_edit", {
            module: t("logger_step_photos"),
          })}
          onPress={onEdit}
          style={({ pressed }) => ({
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
            borderRadius: RADIUS.sm,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: colors.logCardBorder,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Image width={20} height={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </ScrollView>
  );

  return hasGallery ? (
    <PhotoGallery photos={photos} context="day">
      {row}
    </PhotoGallery>
  ) : (
    row
  );
};
