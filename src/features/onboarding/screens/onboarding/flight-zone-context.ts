import { createContext } from "react";

import type { FlightZone } from "@/components/sky-pixy";

/**
 * Lets the current slide report its free sky to the onboarding screen.
 * Null outside onboarding: a `SkyFlightZone` there reports nothing.
 */
export const FlightZoneContext = createContext<
  ((zone: FlightZone | null) => void) | null
>(null);
