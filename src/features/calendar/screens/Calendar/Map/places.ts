import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { DATE_FORMAT } from "@/constants/Config";
import { getItemDate } from "@/lib/logDates";

/** The map shows entries of this many days, today included. */
export const MAP_DAYS = 30;

/** Entry with a place, as the map shows it. */
export type MapEntry = LogItem & { location: NonNullable<LogItem["location"]> };

/** Point on the map. */
export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

// 4 decimals: about 11 m. Check-ins at one spot share one pin.
const PLACE_KEY_DECIMALS = 4;

// Web Mercator: meters per point at zoom 0 on the equator, 256 point tiles.
const METERS_PER_POINT_AT_ZOOM_0 = 156_543.03;
const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Entries of the last {@link MAP_DAYS} days that have a place, oldest
 * first: the card row reads left to right like time.
 */
export const getMapEntries = (
  items: LogItem[],
  today = dayjs()
): MapEntry[] => {
  const firstDay = today.subtract(MAP_DAYS - 1, "day").format(DATE_FORMAT);
  return items
    .filter(
      (item): item is MapEntry =>
        item.location !== undefined && getItemDate(item) >= firstDay
    )
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
};

/** Pin id of an entry's place. Entries at one spot share it. */
export const getPlaceKey = ({ location }: MapEntry) =>
  `${location.latitude.toFixed(PLACE_KEY_DECIMALS)},${location.longitude.toFixed(PLACE_KEY_DECIMALS)}`;

/**
 * One pin per place: the newest entry there, keyed by {@link getPlaceKey}.
 * `entries` must be oldest first, like {@link getMapEntries} returns them.
 */
export const getMapPlaces = (entries: MapEntry[]): Map<string, MapEntry> => {
  const places = new Map<string, MapEntry>();
  for (const entry of entries) {
    places.set(getPlaceKey(entry), entry);
  }
  return places;
};

/**
 * Camera center that shows `point` `offset` points above the middle of the
 * map, so the pin stays visible above the card row.
 */
export const getCameraCenter = (
  point: MapCoordinates,
  zoom: number,
  offset: number
): MapCoordinates => {
  const metersPerPoint =
    (METERS_PER_POINT_AT_ZOOM_0 * Math.cos((point.latitude * Math.PI) / 180)) /
    2 ** zoom;
  return {
    latitude:
      point.latitude - (offset * metersPerPoint) / METERS_PER_DEGREE_LATITUDE,
    longitude: point.longitude,
  };
};
