/** Preset relationship roles for people. */
export const ROLE_PRESETS = [
  "partner",
  "parent",
  "child",
  "sibling",
  "friend",
  "colleague",
  "other",
] as const;

export type RolePreset = (typeof ROLE_PRESETS)[number];

/** Check if a string is a preset role. */
export const isPresetRole = (role: string): role is RolePreset =>
  ROLE_PRESETS.includes(role as RolePreset);
