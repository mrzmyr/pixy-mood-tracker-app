import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useAnalytics } from "@/state/analytics";
import type { AnalyticsEvents } from "@/state/analytics/events";
import { useSettingsLoad } from "@/state/settings";
import { useNotificationTaps } from "./useNotificationTaps";
import type { NotificationResponseSource } from "./useNotificationTaps";

/** `content.data` of every scheduled reminder. Marks taps as reminder taps. */
export const REMINDER_NOTIFICATION_DATA = { kind: "reminder" } as const;

/**
 * Whether the response is a tap on the reminder body, not a dismiss or
 * another action.
 *
 * Reminders scheduled before the data marker existed have no `data`. They
 * still match by their repeating daily (Android) or calendar (iOS) trigger.
 * The app schedules no other repeating notification.
 */
export const isReminderTap = (response: NotificationResponse): boolean => {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return false;
  }

  const { content, trigger } = response.notification.request;
  if (content.data?.kind === REMINDER_NOTIFICATION_DATA.kind) {
    return true;
  }

  if (!trigger || !("type" in trigger)) {
    return false;
  }

  return (
    trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY ||
    (trigger.type === Notifications.SchedulableTriggerInputTypes.CALENDAR &&
      trigger.repeats === true)
  );
};

/** Event properties for one reminder tap. No notification text. */
export const getReminderTapProperties = (
  response: NotificationResponse,
  { coldStart, now }: { coldStart: boolean; now: number }
): AnalyticsEvents["reminders:notification_opened"] => ({
  cold_start: coldStart,
  minutes_since_delivered: Math.max(
    0,
    Math.round((now - response.notification.date) / 60_000)
  ),
});

/**
 * Send `reminders:notification_opened` once per reminder tap.
 *
 * - Cold start: the response that launched the app (`cold_start: true`)
 * - Warm start: taps while the app runs or sits in background
 * - Waits for stored settings, so a stored analytics opt-out wins
 * - No-op on web
 */
export const useReminderTapTracking = (source?: NotificationResponseSource) => {
  const analytics = useAnalytics();
  const isSettingsReady = useSettingsLoad().status === "ready";

  useNotificationTaps({
    select: (response) => (isReminderTap(response) ? response : null),
    isReady: isSettingsReady,
    onTaps: (taps) => {
      for (const { response, coldStart } of taps) {
        analytics.track(
          "reminders:notification_opened",
          getReminderTapProperties(response, { coldStart, now: Date.now() })
        );
      }
    },
    source,
  });
};
