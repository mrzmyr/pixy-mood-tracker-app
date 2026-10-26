import { z } from "zod";

/** Relationship roles a person can have. No custom roles: users request missing ones. */
export const ROLE_PRESETS = [
  "partner",
  "parent",
  "child",
  "sibling",
  "friend",
  "colleague",
  "other",
] as const;

/** One fixed role. Stored as is, so never rename a key. */
export type RolePreset = (typeof ROLE_PRESETS)[number];

/**
 * Stored or imported role. An unknown value, for example from a newer app
 * version, reads as no role instead of failing the whole read.
 */
export const RoleSchema = z
  .unknown()
  .optional()
  .transform((value) => ROLE_PRESETS.find((role) => role === value));
