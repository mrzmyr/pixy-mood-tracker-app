import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
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
  analyticsEnabled: DEFAULT_ANALYTICS_ENABLED,
  actionsDone: [],
  steps: ["rating", "emotions", "tags", "message", "feedback"],
  confirmationEnabled: true,
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
};
