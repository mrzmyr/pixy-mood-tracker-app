import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import type { LogItem } from "@/features/logs";
import { PhotoThumbnail } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { SectionHeader } from "./SectionHeader";

const THUMBNAIL_SIZE = 96;

/**
 * Photos section of an entry card, like emotions and tags: the pencil opens
 * the logger at the photos step, the only way to add photos here. Each
 * thumbnail opens the viewer. Without photos: an empty line.
 */
export const Photos = ({
  item,
  canEdit,
}: {
  item: LogItem;
  /** Shows the pencil; off while the `photos` feature flag is off. */
  canEdit: boolean;
}) => {
  const colors = useColors();
  const router = useRouter();
  const { photos } = item;

  const open = (index: number) => {
    router.push({
      pathname: "/photos/[id]",
      params: { id: item.id, index: String(index) },
    });
  };

  return (
    <View testID="log-list-photos">
      <SectionHeader
        title={t("view_log_photos")}
        editTestID="log-list-photos-edit"
        onEdit={
          canEdit
            ? () => {
                router.push({
                  pathname: "/logs/[id]/edit",
                  params: { id: item.id, step: "photos" },
                });
              }
            : undefined
        }
      />
      {photos.length > 0 ? (
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
      ) : (
        <View style={{ paddingTop: 4, paddingBottom: 8, paddingHorizontal: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 17 }}>
            {t("view_log_photos_empty")}
          </Text>
        </View>
      )}
    </View>
  );
};
