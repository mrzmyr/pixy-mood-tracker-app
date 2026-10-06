/**
 * Bezel: an outer shell with a hairline border and a soft shadow, a small
 * gap, then the inner surface with its own border. Used for cards, list
 * groups, and calendar days.
 */
export const BEZEL = {
  /** Space between shell and inner surface on cards and list groups. */
  gap: 5,
  /** Space between shell and inner surface on calendar days. */
  dayGap: 3,
  borderWidth: 1,
} as const;

/**
 * Shell radius for an inner surface radius. Inner radius plus gap plus
 * border keeps both corners concentric.
 */
export const getBezelRadius = (innerRadius: number, gap: number) =>
  innerRadius + gap + BEZEL.borderWidth;
