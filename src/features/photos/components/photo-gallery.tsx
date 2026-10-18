import { Galeria } from "@nandorojo/galeria";
import { createContext, useContext, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { useAnalytics } from "@/state/analytics";
import type { LogPhoto } from "@/types";
import type { PhotoViewerContext } from "../screens/viewer";
import { getPhotoFile } from "../storage";

/** Native viewer exists on this platform. Web uses `PhotoViewer` instead. */
export const IS_PHOTO_GALLERY_SUPPORTED = true;

interface GalleryEvents {
  onIndexChange: (tileIndex: number, currentIndex: number) => void;
  onDismiss: (tileIndex: number) => void;
}

const GalleryEventsContext = createContext<GalleryEvents | null>(null);

/**
 * Native photo viewer (Galeria) around tiles of stored entry photos. Tap a
 * {@link PhotoGalleryItem}: the photo grows from its tile to full screen.
 * Swipe down shrinks it back into the tile. Pinch, double tap zoom, and
 * paging are native.
 *
 * Stored photos only: imports cap them at `MAX_PHOTO_EDGE`, so a full-screen
 * decode stays small. Drafts keep `PhotoViewerModal` (Remove button, 48 MP
 * originals).
 *
 * Tracks `photos:viewer_closed` on dismiss, same payload as `PhotoViewer`.
 */
export const PhotoGallery = ({
  photos,
  context,
  children,
}: {
  photos: LogPhoto[];
  context: PhotoViewerContext;
  children: ReactNode;
}) => {
  const analytics = useAnalytics();
  // Tile indexes seen since the viewer opened. iOS sends no index event
  // for the first page, so the tile that opened the viewer counts too.
  const viewedIndexes = useRef(new Set<number>());

  const photosCount = photos.length;
  const events = useMemo<GalleryEvents>(
    () => ({
      onIndexChange: (tileIndex, currentIndex) => {
        viewedIndexes.current.add(tileIndex);
        viewedIndexes.current.add(currentIndex);
      },
      onDismiss: (tileIndex) => {
        viewedIndexes.current.add(tileIndex);
        analytics.track("photos:viewer_closed", {
          context,
          photos_count: photosCount,
          viewed_count: viewedIndexes.current.size,
        });
        viewedIndexes.current = new Set();
      },
    }),
    [analytics, context, photosCount]
  );

  return (
    <Galeria urls={photos.map((photo) => getPhotoFile(photo).uri)} theme="dark">
      <GalleryEventsContext.Provider value={events}>
        {children}
      </GalleryEventsContext.Provider>
    </Galeria>
  );
};

/**
 * Tile that opens the {@link PhotoGallery} viewer at `index`. The child must
 * render an image view (`expo-image`): Galeria attaches the tap to it. A
 * placeholder for a missing file opens nothing.
 */
export const PhotoGalleryItem = ({
  index,
  children,
}: {
  index: number;
  children: ReactElement;
}) => {
  const events = useContext(GalleryEventsContext);

  return (
    <Galeria.Image
      index={index}
      onIndexChange={(event) =>
        events?.onIndexChange(index, event.nativeEvent.currentIndex)
      }
      onDismiss={() => events?.onDismiss(index)}
    >
      {children}
    </Galeria.Image>
  );
};
