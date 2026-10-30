import { AppleMaps } from "expo-maps";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { PlacesMapProps } from "./places-map-props";

/** Apple Maps draws the places slides on iOS. */
export const HAS_PLACES_MAP = true;

/** The map starts this many zoom steps further out, then flies in. */
const ZOOM_IN_STEPS = 2.5;
/** Wait before the flight, so the slide change settles first. */
const ZOOM_IN_DELAY_MS = 350;

/**
 * Full-screen Apple Maps that zooms in on the week's places once, then
 * holds still: the view takes no touches, so taps reach the story and the
 * map never pans or zooms by hand. Reduced motion: no zoom.
 */
export const PlacesMap = ({ center, zoom }: PlacesMapProps) => {
  const ref = useRef<AppleMaps.MapView>(null);
  const isReducedMotion = useReducedMotion();
  const { latitude, longitude } = center;
  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    const timer = setTimeout(() => {
      ref.current?.setCameraPosition({
        coordinates: { latitude, longitude },
        zoom,
      });
    }, ZOOM_IN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isReducedMotion, latitude, longitude, zoom]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <AppleMaps.View
        ref={ref}
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: center,
          zoom: isReducedMotion ? zoom : zoom - ZOOM_IN_STEPS,
        }}
        uiSettings={{
          compassEnabled: false,
          myLocationButtonEnabled: false,
          scaleBarEnabled: false,
          togglePitchEnabled: false,
        }}
        properties={{ pointsOfInterest: { including: [] } }}
      />
    </View>
  );
};
