import { Image } from "expo-image";
import { ImageOff, Trash, X } from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Carousel } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { getPhotoFile } from "../storage";

// The viewer is black in both color schemes, like the system photo viewers.
const BACKGROUND = "black";
const FOREGROUND = "white";
const FOREGROUND_MUTED = "rgba(255, 255, 255, 0.4)";

const ViewerPhoto = ({ photo }: { photo: LogPhoto }) => {
  const [hasLoadError, setHasLoadError] = useState(false);
  const file = getPhotoFile(photo);

  if (hasLoadError || !file.exists) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ImageOff color={FOREGROUND_MUTED} size={48} />
        <Text style={{ color: FOREGROUND_MUTED, fontSize: 17, marginTop: 8 }}>
          {t("photos_missing")}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: file.uri }}
      style={{ flex: 1 }}
      contentFit="contain"
      recyclingKey={photo.id}
      cachePolicy="memory"
      accessibilityIgnoresInvertColors
      onError={() => setHasLoadError(true)}
    />
  );
};

/**
 * Full-screen photo pager: swipe between photos, page dots, counter, close
 * button. Works for stored entries and drafts: the caller passes the photos.
 *
 * The trash button shows only with `onRemove`. After the caller drops the
 * photo from `photos`, the pager shows the next photo, or the previous one
 * when the last photo was removed. Closing on an empty list is up to the
 * caller.
 */
export const PhotoViewer = ({
  photos,
  initialIndex = 0,
  onClose,
  onRemove,
}: {
  photos: LogPhoto[];
  initialIndex?: number;
  onClose: () => void;
  onRemove?: (photo: LogPhoto) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  // Clamped: a removed last photo leaves `index` past the end.
  const currentIndex = Math.max(Math.min(index, photos.length - 1), 0);
  const currentPhoto = photos[currentIndex];

  return (
    <View
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      testID="photo-viewer"
    >
      {photos.length > 0 && (
        <Carousel
          // Remount on removal so the pager lands on `currentIndex`.
          key={photos.length}
          loop={false}
          data={photos}
          itemSize={width}
          defaultIndex={currentIndex}
          onSnapToItem={setIndex}
          style={{ flex: 1, width }}
          renderItem={({ item }) => <ViewerPhoto photo={item} />}
        />
      )}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: 44,
        }}
      >
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("photos_viewer_close")}
          testID="photo-viewer-close"
          style={{
            position: "absolute",
            left: 8,
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X color={FOREGROUND} size={26} />
        </Pressable>
        {photos.length > 1 && (
          <Text
            style={{
              color: FOREGROUND,
              fontSize: 17,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
            }}
          >
            {t("photos_viewer_counter", {
              index: currentIndex + 1,
              count: photos.length,
            })}
          </Text>
        )}
        {onRemove && currentPhoto && (
          <Pressable
            onPress={() => onRemove(currentPhoto)}
            accessibilityRole="button"
            accessibilityLabel={t("photos_remove_label", {
              index: currentIndex + 1,
            })}
            testID="photo-viewer-remove"
            style={{
              position: "absolute",
              right: 8,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash color={FOREGROUND} size={24} />
          </Pressable>
        )}
      </View>
      {photos.length > 1 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: insets.bottom + 16,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {photos.map((photo, dotIndex) => (
            <View
              key={photo.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  dotIndex === currentIndex ? FOREGROUND : FOREGROUND_MUTED,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * {@link PhotoViewer} in a full-screen modal, for draft photos that have no
 * stored entry to route to yet.
 */
export const PhotoViewerModal = ({
  photos,
  initialIndex,
  isVisible,
  onClose,
}: {
  photos: LogPhoto[];
  initialIndex?: number;
  isVisible: boolean;
  onClose: () => void;
}) => (
  <Modal
    visible={isVisible}
    animationType="fade"
    presentationStyle="fullScreen"
    onRequestClose={onClose}
  >
    <PhotoViewer
      photos={photos}
      initialIndex={initialIndex}
      onClose={onClose}
    />
  </Modal>
);
