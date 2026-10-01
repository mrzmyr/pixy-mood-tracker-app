import type { SettingsState } from "@/state/settings";

/**
 * Settings used before storage loads and for fresh installs.
 *
 * `loaded: false` keeps the persist effect in `SettingsProvider` disabled
 * until stored settings are read, so defaults never overwrite them.
 */
export const INITIAL_STATE: SettingsState = {
  loaded: false,
  deviceId: null,
  scaleType: "ColorBrew-RdYlGn",
  reminderEnabled: false,
  reminderTime: "18:00",
  analyticsEnabled: true,
  actionsDone: [],
  // `photos` is on for new installs only. Stored settings keep their own
  // step list, so existing users turn it on in Settings > Steps.
  steps: ["rating", "emotions", "tags", "message", "photos", "feedback"],
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
};
