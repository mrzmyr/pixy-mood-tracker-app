import type { PlaceMapProps } from "./placeMapProps";

/**
 * Map of the picked place. Apple Maps on iOS only (`PlaceMap.ios.tsx`).
 * Android has no map: Google Maps needs an API key, and `expo-maps` is not
 * linked there. Renders nothing.
 */
export const PlaceMap = (_props: PlaceMapProps) => null;
