import { Platform } from "react-native";
import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
import type { SettingsState } from "@/state/settings";

/**
 * Default daily reminder time (`HH:mm`) for new users. Most entries are
 * logged in the evening. Stored settings keep their own time.
 */
export const DEFAULT_REMINDER_TIME = "20:00";

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
  reminderTime: DEFAULT_REMINDER_TIME,
  analyticsEnabled: DEFAULT_ANALYTICS_ENABLED,
  // iCloud backup needs no sign-in, so it starts on. Google Drive starts off
  // until the user signs in.
  backupEnabled: Platform.OS === "ios",
  backupWrittenAt: null,
  actionsDone: [],
  // `photos` is on for new installs only. Stored settings keep their own
  // step list, so existing users turn it on in Settings > Steps.
  steps: ["rating", "emotions", "tags", "message", "photos", "feedback"],
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
  photosDayAccessDismissed: false,
};
