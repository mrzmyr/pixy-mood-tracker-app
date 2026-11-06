/**
 * Spacing scale for padding, margin, and gap. The parent sets space between
 * children with `gap`.
 *
 * `pixy-standards/spacing-token` blocks a literal that equals a step. Values
 * off the scale, such as platform mimics or hairline nudges below 4, stay
 * literal.
 */
export const SPACE = {
  /** Icon to label, tight inline groups. */
  xs: 4,
  /** Items in a row or stack, chip padding. */
  sm: 8,
  /** Control padding, list row gaps. */
  md: 12,
  /** Screen edge, card padding, section gaps. */
  lg: 16,
  /** Space between groups. */
  xl: 20,
  /** Space between sections. */
  xxl: 24,
  /** Large breaks, such as above a footer. */
  xxxl: 32,
} as const;
