/**
 * Bezel: an outer shell with a hairline border and a soft shadow, a small
 * gap, then the inner surface with its own border. Used for statistics
 * cards and person tiles.
 */
export const BEZEL = {
  /** Space between shell and inner surface. */
  gap: 5,
  borderWidth: 1,
} as const;

/**
 * Shell radius for an inner surface radius. Inner radius plus gap plus
 * border keeps both corners concentric.
 */
export const getBezelRadius = (innerRadius: number, gap: number) =>
  innerRadius + gap + BEZEL.borderWidth;
