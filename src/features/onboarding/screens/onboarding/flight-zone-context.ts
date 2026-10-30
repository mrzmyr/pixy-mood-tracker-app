import { createContext } from "react";

/** Free sky in window coordinates. */
export interface FlightZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Lets the current slide report its free sky to the onboarding screen.
 * Null outside onboarding: a `SkyFlightZone` there reports nothing.
 */
export const FlightZoneContext = createContext<
  ((zone: FlightZone | null) => void) | null
>(null);
