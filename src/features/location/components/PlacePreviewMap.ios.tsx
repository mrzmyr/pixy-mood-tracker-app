import { AppleMaps } from "expo-maps";
import useColors from "@/hooks/useColors";
import type { LogLocation } from "@/types";

/** Close enough to show the neighborhood around the pin. */
const ZOOM = 13;

/**
 * Apple Maps view of a stored place for previews. The caller turns off
 * touches, so taps reach the surrounding card.
 */
export const PlacePreviewMap = ({ location }: { location: LogLocation }) => {
  const colors = useColors();
  const coordinates = {
    latitude: location.latitude,
    longitude: location.longitude,
  };

  return (
    <AppleMaps.View
      style={{ flex: 1 }}
      cameraPosition={{ coordinates, zoom: ZOOM }}
      markers={[{ id: "place", coordinates, tintColor: colors.tint }]}
      uiSettings={{
        compassEnabled: false,
        myLocationButtonEnabled: false,
        scaleBarEnabled: false,
        togglePitchEnabled: false,
      }}
      properties={{ pointsOfInterest: { including: [] } }}
    />
  );
};
