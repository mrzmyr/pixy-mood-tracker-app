/**
 * Corner radius scale. Pick a step by role, not by element size.
 *
 * Geometric circles (`size / 2`) and platform mimics, such as the Material
 * FAB or the notification preview, keep their own values.
 */
export const RADIUS = {
  /** Chart bars, color swatches, small marks. */
  xs: 4,
  /** Text inputs, chips, badges, compact controls. */
  sm: 8,
  /** Cards, list groups, tiles, toasts, tooltips. */
  md: 12,
  /** Large feature cards. */
  lg: 20,
  /** Capsule buttons, pills, dots. */
  full: 999,
} as const;
