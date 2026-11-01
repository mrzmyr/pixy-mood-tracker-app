/**
 * CSS box shadows for the `boxShadow` style prop. Both platforms draw the
 * same shadow, so do not add `shadowColor`, `shadowOffset`, `shadowOpacity`,
 * `shadowRadius` or `elevation`.
 *
 * Theme-dependent shadows (bezel, recap cards) live in the color tokens.
 */
export const SHADOW = {
  /** Hairline under a sticky header that sits above scrolling content. */
  header: "0 2px 2px rgba(0, 0, 0, 0.12)",
  /** Resting tile on a tinted surface. */
  tile: "0 4px 24px rgba(0, 0, 0, 0.06)",
  /** Card over a photo, such as voice mode cards on the sky. */
  photoCard: "0 6px 18px rgba(30, 60, 110, 0.12)",
  /** Floating action button without a glass background. */
  float: "0 4px 16px rgba(0, 0, 0, 0.16)",
  /** Material 3 elevation level 3, used by the Android snackbar. */
  snackbar: "0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)",
} as const;
