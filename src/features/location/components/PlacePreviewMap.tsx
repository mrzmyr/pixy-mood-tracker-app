import type { LogLocation } from "@/types";
import { PlacePreviewPlaceholder } from "./PlacePreviewPlaceholder";

/**
 * Map preview stand-in for platforms without `expo-maps`: a pin icon.
 * Still Apple Maps image on iOS (`PlacePreviewMap.ios.tsx`).
 */
export const PlacePreviewMap = (_props: { location: LogLocation }) => (
  <PlacePreviewPlaceholder />
);
