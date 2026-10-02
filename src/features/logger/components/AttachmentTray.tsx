import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import {
  MAX_PHOTOS_PER_ENTRY,
  PhotoThumbnail,
  PhotoViewerModal,
} from "@/features/photos";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import {
  TRAY_BOTTOM_OFFSET,
  TRAY_HEIGHT,
  isTrayVisible,
} from "../attachmentTray";

const THUMBNAIL_SIZE = 48;
const BADGE_SPACE = 10;

/**
 * Strip of draft photos above the floating next/save button, with remove
 * buttons and a "3 of 6" count. A tap on a photo opens the draft viewer.
 *
 * The logger renders it outside the slide carousel, so it stays while
 * slides change. Renders nothing without photos.
 */
export const AttachmentTray = ({
  photos,
  onRemove,
}: {
  photos: LogPhoto[];
  onRemove: (photo: LogPhoto) => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!isTrayVisible({ photosCount: photos.length })) {
    return null;
  }

  return (
    <View
      testID="logger-attachment-tray"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + TRAY_BOTTOM_OFFSET,
        height: TRAY_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.logBackground,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        // 48pt tiles in the 64pt strip; the top padding leaves room for the
        // compact remove badges that stick out above the tiles.
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: BADGE_SPACE,
          paddingBottom: TRAY_HEIGHT - THUMBNAIL_SIZE - BADGE_SPACE,
        }}
      >
        {photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            index={index}
            count={photos.length}
            size={THUMBNAIL_SIZE}
            isCompact
            onPress={() => setViewerIndex(index)}
            onRemove={() => onRemove(photo)}
          />
        ))}
      </ScrollView>
      <Text
        testID="logger-attachment-count"
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          fontVariant: ["tabular-nums"],
          paddingRight: 20,
        }}
      >
        {t("photos_count_of", {
          count: photos.length,
          max: MAX_PHOTOS_PER_ENTRY,
        })}
      </Text>
      <PhotoViewerModal
        photos={photos}
        initialIndex={viewerIndex ?? 0}
        isVisible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
};
