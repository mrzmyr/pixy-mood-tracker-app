/**
 * Gaps that belong to the type roles. Every value sits on the 4pt grid.
 * Space above a heading stays larger than the space under it.
 */
export const typeSpace = {
  /** Caption under a control. */
  caption: 8,
  /** Under a title or section, and between paragraphs. */
  underHeading: 12,
  /** Under a display headline. */
  underDisplay: 16,
  /** Horizontal padding on a normal screen, and the space added below the safe-area inset. */
  screen: 16,
  /** Related sections. */
  related: 24,
  /** Unrelated sections. */
  unrelated: 32,
} as const;
