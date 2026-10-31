import type { PlacesMapProps } from "./places-map-props";

/**
 * No map on Android: Google Maps needs an API key, and `expo-maps` is not
 * linked there. The places slides show the sky and a list instead.
 */
export const HAS_PLACES_MAP = false;

/** Renders nothing: Android has no map. */
export const PlacesMap = (_props: PlacesMapProps) => null;
