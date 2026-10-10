/** Point on the map. */
export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

/** Props shared by the iOS map and the empty fallback on other platforms. */
export interface PlaceMapProps {
  /** Camera center. Moves the camera when it changes. `null`: map default. */
  center: MapCoordinates | null;
  /** Pin position. `null`: no pin. */
  pin: MapCoordinates | null;
  /** The user tapped the map at `coordinates`. */
  onPick: (coordinates: MapCoordinates) => void;
}
