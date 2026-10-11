import { useRouter } from "expo-router";
import { Image } from "react-native-feather";
import { Pressable, ScrollView } from "react-native";
import type { LogItem } from "@/features/logs";
import { PhotoThumbnail } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/Radius";
import { INSET } from "./layout";

const THUMBNAIL_SIZE = 96;

/**
 * Photos of an entry card as one scrollable row. Each thumbnail opens the
 * viewer. With `onEdit`, a dashed tile at the end opens the logger at the
 * photos step. Without photos it renders nothing; the add pills offer the
 * step instead.
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

  return (
    <ScrollView
      testID="log-list-photos"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: INSET }}
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
};
