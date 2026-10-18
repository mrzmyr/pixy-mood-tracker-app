import type { ReactElement, ReactNode } from "react";
import type { LogPhoto } from "@/types";
import type { PhotoViewerContext } from "../screens/Viewer";

/**
 * Web has no native viewer. Callers open `PhotoViewer` through the
 * `/photos/[id]` route instead. Keeps Galeria and its web dependency
 * (framer-motion) out of the web bundle.
 */
export const IS_PHOTO_GALLERY_SUPPORTED = false;

/** Web stand-in for the native viewer: renders the tiles unchanged. */
export const PhotoGallery = ({
  children,
}: {
  photos: LogPhoto[];
  context: PhotoViewerContext;
  children: ReactNode;
}) => children;

/** Web stand-in for a native viewer tile: renders the tile unchanged. */
export const PhotoGalleryItem = ({
  children,
}: {
  index: number;
  children: ReactElement;
}) => children;
