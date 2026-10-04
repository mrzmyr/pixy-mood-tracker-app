import { Image } from "expo-image";
import { ImageOff, Trash2, X } from "lucide-react-native";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { Carousel } from "react-native-reanimated-carousel";
import type {
  CarouselPanGesture,
  CarouselRef,
} from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { usePhotoZoom } from "../hooks/usePhotoZoom";
import { AXIS_LOCK_DISTANCE, useSwipeToClose } from "../hooks/useSwipeToClose";
import type { PhotoViewerItem } from "../viewerItem";

// The viewer is black in both color schemes, like the system photo viewers.
const BACKGROUND = "black";
const FOREGROUND = "white";
const FOREGROUND_MUTED = "rgba(255, 255, 255, 0.4)";
const REMOVE_BUTTON_BACKGROUND = "rgba(255, 255, 255, 0.16)";
const REMOVE_BUTTON_HEIGHT = 44;
const BOTTOM_GAP = 16;
// Horizontal drags page, vertical drags close (`useSwipeToClose`). Two
// fingers pinch (`usePhotoZoom`).
const configureCarouselPan = (gesture: CarouselPanGesture) => {
  gesture
    .maxPointers(1)
    .activeOffsetX([-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE])
    .failOffsetY([-AXIS_LOCK_DISTANCE, AXIS_LOCK_DISTANCE]);
};

const ViewerPhoto = ({
  item,
  onZoomChange,
}: {
  item: PhotoViewerItem;
  onZoomChange: (isZoomed: boolean) => void;
}) => {
  const { width, height } = useWindowDimensions();
  const [hasLoadError, setHasLoadError] = useState(false);
  const [photoSize, setPhotoSize] = useState<{
    width: number;
    height: number;
  }>();
  const zoom = usePhotoZoom({ width, height, photoSize, onZoomChange });

  if (hasLoadError) {
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
    <GestureDetector gesture={zoom.gesture}>
      <Animated.View style={[{ flex: 1 }, zoom.photoStyle]}>
        <Image
          source={{ uri: item.uri }}
          style={{ flex: 1 }}
          contentFit="contain"
          recyclingKey={item.key}
          // Decodes at screen size on iOS. Picked originals can have 48 MP.
          // https://docs.expo.dev/versions/latest/sdk/image/#enforceearlyresizing
          enforceEarlyResizing
          cachePolicy="memory"
          accessibilityIgnoresInvertColors
          onLoad={(event) => setPhotoSize(event.source)}
          onError={() => setHasLoadError(true)}
        />
      </Animated.View>
    </GestureDetector>
  );
};

/** Screen that opened the viewer, for analytics. */
export type PhotoViewerContext = "logger" | "day";

/**
 * Full-screen photo pager: swipe between photos, page dots, counter, close
 * button. Pinch or double tap zooms a photo; while zoomed, drags pan the
 * photo instead of paging or closing. Swipe up or down closes: the photo
 * follows the finger and the backdrop fades to the screen below. With
 * reduce motion the photo stays and the screen fades out. Screen readers
 * page with the adjustable actions and close with the escape gesture.
 * Works for stored entries and drafts: the caller passes the pages.
 * Present it transparent, so the screen below shows through the fading
 * backdrop.
 *
 * View only. With `onRemove`, a bottom "Remove" button calls it with the
 * current page. The caller owns the photos: it removes the page from
 * `items` or closes the viewer.
 *
 * Tracks `photos:viewer_closed` on unmount, so every way out counts (close
 * button, Android back).
 */
export const PhotoViewer = ({
  items,
  initialIndex = 0,
  context,
  onClose,
  onRemove,
}: {
  items: PhotoViewerItem[];
  initialIndex?: number;
  context: PhotoViewerContext;
  onClose: () => void;
  onRemove?: (item: PhotoViewerItem) => void;
}) => {
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Key of the zoomed page. A removed page cannot leave the viewer stuck.
  const [zoomedKey, setZoomedKey] = useState<string>();
  const startIndex = Math.min(Math.max(initialIndex, 0), items.length - 1);
  const [index, setIndex] = useState(startIndex);
  const viewedKeys = useRef(new Set<string>());
  const carousel = useRef<CarouselRef>(null);
  const current = items[index];
  const isZoomed = zoomedKey !== undefined && zoomedKey === current?.key;
  const swipeToClose = useSwipeToClose({
    screenHeight: height,
    isEnabled: !isZoomed,
    onClose,
  });
  const hasRemoveButton = onRemove !== undefined && !!current;
  const dotsBottom =
    insets.bottom +
    BOTTOM_GAP +
    (hasRemoveButton ? REMOVE_BUTTON_HEIGHT + BOTTOM_GAP : 0);

  const markViewed = (pageIndex: number) => {
    const item = items[pageIndex];
    if (item) {
      viewedKeys.current.add(item.key);
    }
  };

  const trackClosed = useEffectEvent(() => {
    markViewed(index);
    analytics.track("photos:viewer_closed", {
      context,
      photos_count: items.length,
      viewed_count: viewedKeys.current.size,
    });
  });

  useEffect(() => () => trackClosed(), []);

  return (
    <View
      style={{ flex: 1 }}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
      testID="photo-viewer"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: BACKGROUND },
          swipeToClose.backdropStyle,
        ]}
      />
      {items.length > 0 && (
        <GestureDetector gesture={swipeToClose.gesture}>
          {/* Swipe alternative for screen readers: swipe up or down on
              the photo to page. */}
          <Animated.View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t("photos_thumbnail_label", {
              index: index + 1,
              count: items.length,
            })}
            accessibilityActions={[
              { name: "increment" },
              { name: "decrement" },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "increment") {
                carousel.current?.next();
              }
              if (event.nativeEvent.actionName === "decrement") {
                carousel.current?.prev();
              }
            }}
            style={[{ flex: 1 }, swipeToClose.photoStyle]}
          >
            <Carousel
              ref={carousel}
              loop={false}
              data={items}
              itemSize={width}
              defaultIndex={startIndex}
              scrollEnabled={!isZoomed}
              onConfigurePanGesture={configureCarouselPan}
              onSnapToItem={(nextIndex) => {
                markViewed(nextIndex);
                setIndex(nextIndex);
              }}
              style={{ flex: 1, width }}
              renderItem={({ item }) => (
                <ViewerPhoto
                  key={item.key}
                  item={item}
                  onZoomChange={(isPhotoZoomed) =>
                    setZoomedKey(isPhotoZoomed ? item.key : undefined)
                  }
                />
              )}
            />
          </Animated.View>
        </GestureDetector>
      )}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, swipeToClose.controlsStyle]}
      >
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
          {items.length > 1 && (
            <Text
              accessibilityLabel={t("photos_thumbnail_label", {
                index: index + 1,
                count: items.length,
              })}
              style={{
                color: FOREGROUND,
                fontSize: 17,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
              }}
            >
              {t("photos_viewer_counter", {
                index: index + 1,
                count: items.length,
              })}
            </Text>
          )}
        </View>
        {items.length > 1 && (
          // Page dots repeat the counter: hidden from screen readers.
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              bottom: dotsBottom,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {items.map((item, dotIndex) => (
              <View
                key={item.key}
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
        {hasRemoveButton && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              bottom: insets.bottom + BOTTOM_GAP,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => onRemove(current)}
              accessibilityRole="button"
              testID="photo-viewer-remove"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: REMOVE_BUTTON_HEIGHT,
                paddingHorizontal: 20,
                borderRadius: REMOVE_BUTTON_HEIGHT / 2,
                backgroundColor: REMOVE_BUTTON_BACKGROUND,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Trash2
                color={FOREGROUND}
                size={20}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                style={{ color: FOREGROUND, fontSize: 17, fontWeight: "600" }}
              >
                {t("photos_viewer_remove")}
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

/**
 * {@link PhotoViewer} in a transparent full-screen modal, for draft photos
 * that have no stored entry to route to yet.
 */
export const PhotoViewerModal = ({
  items,
  initialIndex,
  context,
  isVisible,
  onClose,
  onRemove,
}: {
  items: PhotoViewerItem[];
  initialIndex?: number;
  context: PhotoViewerContext;
  isVisible: boolean;
  onClose: () => void;
  onRemove?: (item: PhotoViewerItem) => void;
}) => (
  <Modal
    visible={isVisible}
    animationType="fade"
    transparent
    onRequestClose={onClose}
  >
    {/* A modal is a separate native root: gestures need their own root
        view on Android. */}
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PhotoViewer
        items={items}
        initialIndex={initialIndex}
        context={context}
        onClose={onClose}
        onRemove={onRemove}
      />
    </GestureHandlerRootView>
  </Modal>
);
