import type { SettingsState } from "@/state/settings";

/**
 * Settings used before storage loads and for fresh installs.
 *
 * `loaded: false` keeps the persist effect in `SettingsProvider` disabled
 * until stored settings are read, so defaults never overwrite them.
 * Stored `steps` replace the default list, so a new default step (for
 * example `photos`) is on only for new installs.
 */
export const INITIAL_STATE: SettingsState = {
  loaded: false,
  deviceId: null,
  scaleType: "ColorBrew-RdYlGn",
  reminderEnabled: false,
  reminderTime: "18:00",
  analyticsEnabled: true,
  actionsDone: [],
  steps: ["rating", "emotions", "tags", "message", "photos", "feedback"],
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
};
