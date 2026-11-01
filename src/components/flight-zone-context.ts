import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FlightZone } from "@/components/sky-pixy";

/**
 * Lets the current screen or slide report its free sky to the owner of
 * cloud Pixy. Null elsewhere: a `SkyFlightZone` there reports nothing.
 */
export const FlightZoneContext = createContext<Dispatch<
  SetStateAction<FlightZone | null>
> | null>(null);
