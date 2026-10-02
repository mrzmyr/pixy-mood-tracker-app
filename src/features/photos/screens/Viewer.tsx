import { Image } from "expo-image";
import { ImageOff, X } from "lucide-react-native";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import { useAnalytics } from "@/state/analytics";
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

/** Screen that opened the viewer, for analytics. */
export type PhotoViewerContext = "logger" | "day";

/**
 * Full-screen photo pager: swipe between photos, page dots, counter, close
 * button. Works for stored entries and drafts: the caller passes the photos.
 * Tracks `photos:viewer_closed` on unmount, so every way out counts (close
 * button, Android back).
 */
export const PhotoViewer = ({
  photos,
  initialIndex = 0,
  context,
  onClose,
}: {
  photos: LogPhoto[];
  initialIndex?: number;
  context: PhotoViewerContext;
  onClose: () => void;
}) => {
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const startIndex = Math.min(Math.max(initialIndex, 0), photos.length - 1);
  const [index, setIndex] = useState(startIndex);
  const viewedIds = useRef(new Set<string>());

  const markViewed = (photoIndex: number) => {
    const photo = photos[photoIndex];
    if (photo) {
      viewedIds.current.add(photo.id);
    }
  };

  const trackClosed = useEffectEvent(() => {
    markViewed(index);
    analytics.track("photos:viewer_closed", {
      context,
      photos_count: photos.length,
      viewed_count: viewedIds.current.size,
    });
  });

  useEffect(() => () => trackClosed(), []);

  return (
    <View
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      testID="photo-viewer"
    >
      {photos.length > 0 && (
        <Carousel
          loop={false}
          data={photos}
          itemSize={width}
          defaultIndex={startIndex}
          onSnapToItem={(nextIndex) => {
            markViewed(nextIndex);
            setIndex(nextIndex);
          }}
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
              index: index + 1,
              count: photos.length,
            })}
          </Text>
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
                  dotIndex === index ? FOREGROUND : FOREGROUND_MUTED,
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
  context,
  isVisible,
  onClose,
}: {
  photos: LogPhoto[];
  initialIndex?: number;
  context: PhotoViewerContext;
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
      context={context}
      onClose={onClose}
    />
  </Modal>
);
