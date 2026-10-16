/** "District, City" or "City". `null` names never count. */
export const parsePlace = (name: string | null | undefined) => {
  if (!name) {
    return null;
  }
  const parts = name.split(", ");
  const [first] = parts;
  return parts.length > 1
    ? { district: first, city: parts.at(-1) ?? first }
    : { district: null, city: first };
};

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometers. */
export const distanceKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};
