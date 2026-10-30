import type { MapPoint } from "./map-camera";

/** Props shared by the iOS map and the empty fallback on other platforms. */
export interface PlacesMapProps {
  center: MapPoint;
  /** `expo-maps` zoom: the view width shows `360 / 2^zoom` degrees. */
  zoom: number;
}
