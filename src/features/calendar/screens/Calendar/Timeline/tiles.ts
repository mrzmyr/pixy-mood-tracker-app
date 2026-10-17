import type { LogItem } from "@/features/logs";

// Apple Journal shows up to three media tiles per card: photos, then the
// map.
const MAX_TILES = 3;

/**
 * Media tiles on top of a timeline card: up to {@link MAX_TILES} photos,
 * one slot less when the place tile shows. The card and its recycling type
 * both read this, so they cannot disagree.
 */
export const getEntryTiles = (item: LogItem, showPlace = true) => {
  const placeTile = showPlace ? item.location : undefined;
  const photos = item.photos.slice(
    0,
    placeTile === undefined ? MAX_TILES : MAX_TILES - 1
  );
  return {
    photos,
    placeTile,
    tileCount: photos.length + (placeTile === undefined ? 0 : 1),
  };
};
