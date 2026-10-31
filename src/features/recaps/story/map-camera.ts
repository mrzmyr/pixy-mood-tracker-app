/** A point on the map. */
export interface MapPoint {
  latitude: number;
  longitude: number;
}

/** Screen area the points must stay inside, in points from the edges. */
export interface MapFrame {
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Web Mercator y of a latitude, in degrees like a longitude. */
const mercator = (latitude: number) =>
  toDegrees(Math.log(Math.tan(Math.PI / 4 + toRadians(latitude) / 2)));

const fromMercator = (y: number) =>
  toDegrees(2 * Math.atan(Math.exp(toRadians(y))) - Math.PI / 2);

/**
 * Camera that fits every point inside the frame, and where each point lands
 * on screen. `zoom` follows `expo-maps`: the view width shows `360 / 2^zoom`
 * degrees of longitude. Apple Maps shows at least the requested span, so a
 * tall view at a high latitude zooms out further; `project` accounts for it.
 */
export const fitCamera = (
  points: MapPoint[],
  frame: MapFrame,
  maxZoom: number
) => {
  const xs = points.map((point) => point.longitude);
  const ys = points.map((point) => mercator(point.latitude));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const innerWidth = frame.width - frame.left - frame.right;
  const innerHeight = frame.height - frame.top - frame.bottom;
  const scale = Math.min(
    maxX > minX ? innerWidth / (maxX - minX) : Infinity,
    maxY > minY ? innerHeight / (maxY - minY) : Infinity,
    (frame.width * 2 ** maxZoom) / 360
  );
  const zoom = Math.log2((360 * scale) / frame.width);
  const frameX = frame.left + innerWidth / 2;
  const frameY = frame.top + innerHeight / 2;
  const centerOf = (pixels: number) => ({
    x: (minX + maxX) / 2 - (frameX - frame.width / 2) / pixels,
    y: (minY + maxY) / 2 + (frameY - frame.height / 2) / pixels,
  });
  // The requested span is as tall as it is wide in degrees; Apple Maps
  // zooms out when that does not fit the view height.
  const span = frame.width / scale;
  const first = centerOf(scale);
  const latitude = fromMercator(first.y);
  const spanHeight =
    mercator(latitude + span / 2) - mercator(latitude - span / 2);
  const shown = Math.min(scale, frame.height / spanHeight);
  const center = centerOf(shown);
  return {
    center: { latitude: fromMercator(center.y), longitude: center.x },
    zoom,
    project: (point: MapPoint) => ({
      x: frame.width / 2 + (point.longitude - center.x) * shown,
      y: frame.height / 2 - (mercator(point.latitude) - center.y) * shown,
    }),
  };
};
