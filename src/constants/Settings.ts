import { Platform } from "react-native";
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
  // iCloud backup needs no sign-in, so it starts on. Google Drive starts off
  // until the user signs in.
  backupEnabled: Platform.OS === "ios",
  actionsDone: [],
  steps: ["rating", "emotions", "tags", "message", "feedback"],
  storeReviewPromptedAt: null,
  storeReviewPromptedAppVersion: null,
};
