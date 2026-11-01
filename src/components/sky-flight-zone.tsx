import { useContext, useEffect, useRef } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { FlightZoneContext } from "@/components/flight-zone-context";
import type { FlightZone } from "@/components/sky-pixy";

/**
 * Empty space on a slide where cloud Pixy may fly. Place it where the slide
 * has no text or controls. One per slide. A slide without one hides Pixy.
 */
export const SkyFlightZone = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const setZone = useContext(FlightZoneContext);
  const ref = useRef<View>(null);
  const reported = useRef<FlightZone | null>(null);

  // Clears only its own zone: the next slide may have reported first.
  useEffect(
    () => () =>
      setZone?.((current) => (current === reported.current ? null : current)),
    [setZone]
  );

  return (
    <View
      ref={ref}
      style={style}
      pointerEvents="none"
      onLayout={() =>
        ref.current?.measureInWindow((x, y, width, height) => {
          reported.current = { x, y, width, height };
          setZone?.(reported.current);
        })
      }
    />
  );
};
