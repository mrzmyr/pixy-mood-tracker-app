import { AppleMaps } from "expo-maps";
import { StyleSheet, View } from "react-native";
import type { PlacesMapProps } from "./places-map-props";

/** Apple Maps draws the places slides on iOS. */
export const HAS_PLACES_MAP = true;

/**
 * Full-screen Apple Maps at a fixed camera. A still image: the view takes no
 * touches, so taps reach the story and the map never pans or zooms.
 */
export const PlacesMap = ({ center, zoom }: PlacesMapProps) => (
  <View
    pointerEvents="none"
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={StyleSheet.absoluteFill}
  >
    <AppleMaps.View
      style={{ flex: 1 }}
      cameraPosition={{ coordinates: center, zoom }}
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
