import type { LogPhoto } from "@/types";
import { getPhotoFile } from "./storage";

/** One page of the photo viewer (`PhotoViewer`). */
export interface PhotoViewerItem {
  /** Unique in the list. Counts viewed pages for analytics. */
  key: string;
  /**
   * Image to show: a stored photo file, or a picked file that is still
   * importing.
   */
  uri: string;
}

/** Viewer page of a stored entry photo. */
export const getViewerItem = ({
  photo,
}: {
  photo: LogPhoto;
}): PhotoViewerItem => ({
  key: photo.id,
  uri: getPhotoFile(photo).uri,
});
