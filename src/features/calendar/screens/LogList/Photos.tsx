import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import {
  AddPhotoTile,
  PhotoThumbnail,
  showAddPhotoMenu,
  usePhotoActions,
} from "@/features/photos";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { SectionHeader } from "./SectionHeader";

const THUMBNAIL_SIZE = 96;

/**
 * Photos section of an entry card. Always shown, also without photos, so
 * the card is where photos are added. Picked photos save to the entry at
 * once: no draft, no save button. Thumbnails open the photo viewer, where
 * photos are removed. The add tile hides when the entry is full.
 */
export const Photos = ({ item }: { item: LogItem }) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const logUpdater = useLogUpdater();
  const { photos } = item;
  const photoActions = usePhotoActions({
    photos,
    onChange: (next) => logUpdater.editLog({ id: item.id, photos: next }),
    mode: "edit",
  });
  const isEmpty = photos.length === 0;

  const open = (index: number) => {
    analytics.track("day:photo_opened", {
      photos_count: photos.length,
      index,
    });
    router.push({
      pathname: "/photos/[id]",
      params: { id: item.id, index: String(index) },
    });
  };

  const add = () => {
    analytics.track("day:photo_add_tapped");
    showAddPhotoMenu({
      onLibrary: photoActions.addFromLibrary,
      onCamera: photoActions.addFromCamera,
    });
  };

  return (
    <View testID="log-list-photos">
      <SectionHeader title={t("view_log_photos")} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingTop: 4, paddingBottom: 8 }}
      >
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            count={photos.length}
            size={THUMBNAIL_SIZE}
            onPress={() => open(index)}
          />
        ))}
        {!photoActions.isFull && (
          <AddPhotoTile
            onPress={add}
            size={THUMBNAIL_SIZE}
            label={isEmpty ? t("photos_add_first") : t("photos_add")}
            disabled={photoActions.isAdding}
          />
        )}
      </ScrollView>
    </View>
  );
};
