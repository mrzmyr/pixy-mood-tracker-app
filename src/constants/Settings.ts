import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
import type { SettingsState } from "@/state/settings";

/**
 * Default daily reminder time (`HH:mm`) for new users. Most entries are
 * logged in the evening. Stored settings keep their own time.
 */
export const DEFAULT_REMINDER_TIME = "20:00";

/**
 * Settings used before storage loads and for fresh installs. The settings
 * store never writes them before stored settings are read.
 */
export const INITIAL_STATE: SettingsState = {
  deviceId: null,
  scaleType: "ColorBrew-RdYlGn",
  reminderEnabled: false,
  reminderTime: DEFAULT_REMINDER_TIME,
  analyticsEnabled: DEFAULT_ANALYTICS_ENABLED,
  actionsDone: [],
  // `photos` and `sleep` are on for new installs only. Stored settings keep
  // their own step list, so existing users turn them on in Settings > Steps.
  steps: [
    "rating",
    "sleep",
    "emotions",
    "tags",
    "message",
    "photos",
    "feedback",
  ],
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
  photosDayAccessDismissed: false,
  colorScheme: "system",
};
