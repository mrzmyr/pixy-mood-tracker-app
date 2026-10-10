/** Zoom of a photo that fills the screen width or height. */
export const MIN_ZOOM = 1;

/** Largest zoom a pinch keeps after release. */
export const MAX_ZOOM = 4;

/** Zoom after a double tap on a photo at {@link MIN_ZOOM}. */
export const DOUBLE_TAP_ZOOM = 2.5;

/** Zoom above this counts as zoomed in: the viewer stops paging. */
export const ZOOMED_THRESHOLD = 1.01;

interface Size {
  width: number;
  height: number;
}

/** Point or offset relative to the view center. */
interface Point {
  x: number;
  y: number;
}

// Keeps the value within ±limit. A limit of 0 gives 0, never -0.
const clampToLimit = (value: number, limit: number) => {
  "worklet";
  return limit === 0 ? 0 : Math.min(Math.max(value, -limit), limit);
};

/**
 * Size of a photo shown with `contentFit="contain"` in the view.
 * Without a known photo size, the photo fills the view.
 */
export const getContainSize = ({
  view,
  photo,
}: {
  view: Size;
  photo?: Size;
}): Size => {
  "worklet";
  if (!photo || photo.width <= 0 || photo.height <= 0) {
    return view;
  }
  const ratio = Math.min(view.width / photo.width, view.height / photo.height);
  return { width: photo.width * ratio, height: photo.height * ratio };
};

/**
 * Keeps a zoomed photo on screen: an edge of the photo never moves past the
 * same edge of the view. A photo smaller than the view on an axis stays
 * centered on that axis.
 */
export const clampZoomOffset = ({
  offset,
  zoom,
  view,
  photo,
}: {
  offset: Point;
  zoom: number;
  view: Size;
  photo: Size;
}): Point => {
  "worklet";
  return {
    x: clampToLimit(
      offset.x,
      Math.max(0, (photo.width * zoom - view.width) / 2)
    ),
    y: clampToLimit(
      offset.y,
      Math.max(0, (photo.height * zoom - view.height) / 2)
    ),
  };
};

/**
 * Offset that keeps the point under the fingers in place while the zoom
 * changes. `focal` and the offsets are relative to the view center.
 */
export const getFocalOffset = ({
  focal,
  startOffset,
  startZoom,
  zoom,
}: {
  focal: Point;
  startOffset: Point;
  startZoom: number;
  zoom: number;
}): Point => {
  "worklet";
  const ratio = zoom / startZoom;
  return {
    x: focal.x - (focal.x - startOffset.x) * ratio,
    y: focal.y - (focal.y - startOffset.y) * ratio,
  };
};
