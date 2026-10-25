import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
import type { SettingsState } from "@/state/settings";

/**
 * Default daily reminder time (`HH:mm`) for new users. Most entries are
 * logged in the evening. Stored settings keep their own time.
 */
export const DEFAULT_REMINDER_TIME = "20:00";

/** Hours between quick check-ins the settings offer. */
export const QUICK_CHECK_IN_INTERVALS = [2, 3, 4, 6] as const;

/**
 * Default quick check-in schedule: 10:00, 14:00, and 18:00, done before the
 * evening reflection at {@link DEFAULT_REMINDER_TIME}.
 */
export const DEFAULT_QUICK_CHECK_IN_SCHEDULE = {
  from: "10:00",
  until: "18:00",
  everyHours: 4,
};

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
    "photos",
    "message",
    "feedback",
  ],
  storeReviewPromptDates: [],
  storeReviewPromptedAppVersion: null,
  photosDayAccessDismissed: false,
  colorScheme: "system",
  locationEnabled: false,
  calendarLayout: "calendar",
  appLockEnabled: false,
  recapNotificationsEnabled: false,
  profileName: "",
  profileAvatar: null,
  quickCheckInEnabled: false,
  quickCheckInSchedule: DEFAULT_QUICK_CHECK_IN_SCHEDULE,
};
