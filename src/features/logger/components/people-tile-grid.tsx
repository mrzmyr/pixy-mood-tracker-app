import { Platform } from "react-native";
import { getNativePeopleTile } from "./native-people-tile";
import { NativePeopleTileGrid } from "./native-people-tile-grid";
import type { PeopleTileGridProps } from "./people-tile-grid-props";
import { SortablePeopleTileGrid } from "./sortable-people-tile-grid";

/**
 * Person tiles you can reorder and open a menu on. iOS with the native tile
 * module: system context menu that turns into a drag. Elsewhere: sortable
 * grid, release without moving shows the menu.
 */
export const PeopleTileGrid = (props: PeopleTileGridProps) => {
  const NativeTile = Platform.OS === "ios" ? getNativePeopleTile() : null;
  if (NativeTile) {
    return <NativePeopleTileGrid NativeTile={NativeTile} {...props} />;
  }
  return <SortablePeopleTileGrid {...props} />;
};
