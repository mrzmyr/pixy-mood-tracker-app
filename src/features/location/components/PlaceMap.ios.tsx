import { AppleMaps } from "expo-maps";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { PlaceMapProps } from "./placeMapProps";
import { RADIUS } from "@/constants/Radius";

/** Street level, close enough to tell neighborhoods apart. */
const ZOOM = 14;
const HEIGHT = 240;

/**
 * Apple Maps view of the picked place. Tapping the map reports the tapped
 * point through `onPick`; the caller moves the pin.
 */
export const PlaceMap = ({ center, pin, onPick }: PlaceMapProps) => {
  const colors = useColors();
  const ref = useRef<AppleMaps.MapView>(null);
  const latitude = center?.latitude;
  const longitude = center?.longitude;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      return;
    }
    ref.current?.setCameraPosition({
      coordinates: { latitude, longitude },
      zoom: ZOOM,
    });
  }, [latitude, longitude]);

  return (
    <View
      accessibilityHint={t("location_map_hint")}
      style={{
        height: HEIGHT,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        backgroundColor: colors.textInputBackground,
      }}
    >
      <AppleMaps.View
        ref={ref}
        style={{ flex: 1 }}
        cameraPosition={
          center === null ? undefined : { coordinates: center, zoom: ZOOM }
        }
        markers={
          pin === null
            ? []
            : [{ id: "place", coordinates: pin, tintColor: colors.tint }]
        }
        uiSettings={{
          compassEnabled: false,
          myLocationButtonEnabled: false,
          scaleBarEnabled: false,
          togglePitchEnabled: false,
        }}
        properties={{ pointsOfInterest: { including: [] } }}
        onMapClick={({ coordinates }) => {
          if (
            coordinates.latitude !== undefined &&
            coordinates.longitude !== undefined
          ) {
            onPick({
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            });
          }
        }}
      />
    </View>
  );
};
