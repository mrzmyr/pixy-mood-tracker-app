import type { PickTileMenuProps } from "./pick-tile-menu-types";

/** Android and web have no native photo preview: the tile handles a long press itself. */
export const HAS_NATIVE_PREVIEW = false;

/**
 * Long-press menu around a photo tile. iOS shows the native preview
 * (`PickTileMenu.ios.tsx`); other platforms render the tile as is.
 */
export const PickTileMenu = ({ children }: PickTileMenuProps) => children;
