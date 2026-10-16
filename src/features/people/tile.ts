import { BEZEL } from "@/constants/Bezel";

/**
 * Space between avatar and bezel shell border of the `tile` variant: inner
 * border plus bezel gap.
 */
export const TILE_RING_GAP = BEZEL.borderWidth + BEZEL.gap;
/**
 * Bezel shell border of the `tile` variant. Avatar size plus
 * `2 * (TILE_RING_GAP + TILE_RING_WIDTH)` is the tile's outer size.
 */
export const TILE_RING_WIDTH = BEZEL.borderWidth;
