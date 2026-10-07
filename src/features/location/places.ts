import * as Location from "expo-location";
import type { LocationGeocodedAddress } from "expo-location";
import type { LogLocation } from "@/types";

/** Most search results the picker shows. */
const SEARCH_RESULT_LIMIT = 5;

/** A fix this old or newer counts as the current location. */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const LAST_KNOWN_MAX_ACCURACY_M = 500;

/**
 * Short place name: district and city ("Mitte, Berlin"). Falls back to the
 * coarser fields when the geocoder has no city. `null` when the address
 * holds nothing to show.
 */
export const formatPlaceName = (
  address: LocationGeocodedAddress
): string | null => {
  const local = address.district ?? address.subregion ?? address.name;
  const area = address.city ?? address.region ?? address.country;
  const parts = [local, area].filter(
    (part, index, all): part is string =>
      typeof part === "string" && part.length > 0 && all.indexOf(part) === index
  );

  return parts.length > 0 ? parts.join(", ") : null;
};

/** Text for a location: its name, else rounded coordinates. */
export const getLocationLabel = (location: LogLocation): string =>
  location.name ??
  `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;

/**
 * Place at the given coordinates, named by reverse geocoding. Name is `null`
 * when the lookup fails, for example offline.
 */
export const getPlaceAt = async ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): Promise<LogLocation> => {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    return {
      latitude,
      longitude,
      name: address === undefined ? null : formatPlaceName(address),
    };
  } catch {
    // Reverse geocoding needs a network. Keep the coordinates without a name.
    return { latitude, longitude, name: null };
  }
};

/** Location access is granted. Never asks. */
export const hasLocationAccess = async (): Promise<boolean> => {
  const { granted } = await Location.getForegroundPermissionsAsync();
  return granted;
};

/**
 * Current place, or `null` without access or a position fix. Never asks for
 * access. Reuses a recent fix to answer fast.
 */
export const getCurrentPlace = async (): Promise<LogLocation | null> => {
  if (!(await hasLocationAccess())) {
    return null;
  }

  try {
    const position =
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
      })) ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));
    return await getPlaceAt(position.coords);
  } catch {
    // Location services off or no fix. The entry stays without location.
    return null;
  }
};

/** Places matching `query`, named for display. Empty when nothing matches. */
export const searchPlaces = async (query: string): Promise<LogLocation[]> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  let matches: Awaited<ReturnType<typeof Location.geocodeAsync>>;
  try {
    matches = await Location.geocodeAsync(trimmed);
  } catch {
    // The geocoder fails on unknown places and without a network.
    return [];
  }

  return Promise.all(
    matches.slice(0, SEARCH_RESULT_LIMIT).map((match) => getPlaceAt(match))
  );
};
