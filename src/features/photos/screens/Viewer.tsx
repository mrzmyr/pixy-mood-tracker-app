import { Image } from "expo-image";
import { ImageOff, Trash2, X } from "lucide-react-native";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Carousel } from "react-native-reanimated-carousel";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { PhotoViewerItem } from "../viewerItem";

// The viewer is black in both color schemes, like the system photo viewers.
const BACKGROUND = "black";
const FOREGROUND = "white";
const FOREGROUND_MUTED = "rgba(255, 255, 255, 0.4)";
const REMOVE_BUTTON_BACKGROUND = "rgba(255, 255, 255, 0.16)";
const REMOVE_BUTTON_HEIGHT = 44;
const BOTTOM_GAP = 16;

const ViewerPhoto = ({ item }: { item: PhotoViewerItem }) => {
  const [hasLoadError, setHasLoadError] = useState(false);

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
      onError={() => setHasLoadError(true)}
    />
  );
};

/** Screen that opened the viewer, for analytics. */
export type PhotoViewerContext = "logger" | "day";

/**
 * Full-screen photo pager: swipe between photos, page dots, counter, close
 * button. Screen readers page with the adjustable actions. Works for
 * stored entries and drafts: the caller passes the pages.
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
  const { width } = useWindowDimensions();
  const startIndex = Math.min(Math.max(initialIndex, 0), items.length - 1);
  const [index, setIndex] = useState(startIndex);
  const viewedKeys = useRef(new Set<string>());
  const carousel = useRef<CarouselRef>(null);
  const current = items[index];
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
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      accessibilityViewIsModal
      testID="photo-viewer"
    >
      {items.length > 0 && (
        // Swipe alternative for screen readers: swipe up or down on the
        // photo to page.
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("photos_thumbnail_label", {
            index: index + 1,
            count: items.length,
          })}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") {
              carousel.current?.next();
            }
            if (event.nativeEvent.actionName === "decrement") {
              carousel.current?.prev();
            }
          }}
          style={{ flex: 1 }}
        >
          <Carousel
            ref={carousel}
            loop={false}
            data={items}
            itemSize={width}
            defaultIndex={startIndex}
            onSnapToItem={(nextIndex) => {
              markViewed(nextIndex);
              setIndex(nextIndex);
            }}
            style={{ flex: 1, width }}
            renderItem={({ item }) => <ViewerPhoto item={item} />}
          />
        </View>
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
    </View>
  );
};

/**
 * {@link PhotoViewer} in a full-screen modal, for draft photos that have no
 * stored entry to route to yet.
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
    presentationStyle="fullScreen"
    onRequestClose={onClose}
  >
    <PhotoViewer
      items={items}
      initialIndex={initialIndex}
      context={context}
      onClose={onClose}
      onRemove={onRemove}
    />
  </Modal>
);
