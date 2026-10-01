import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import type { LogItem } from "@/features/logs";
import { PhotoThumbnail } from "@/features/photos";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { SectionHeader } from "./SectionHeader";

const THUMBNAIL_SIZE = 96;

/**
 * Photos section of an entry card: a horizontal strip of thumbnails, each
 * opens the photo viewer. The edit action shows only with `onEdit`.
 */
export const Photos = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { photos } = item;

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

  return (
    <View testID="log-list-photos">
      <SectionHeader title={t("view_log_photos")} onEdit={onEdit} />
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
      </ScrollView>
    </View>
  );
};
