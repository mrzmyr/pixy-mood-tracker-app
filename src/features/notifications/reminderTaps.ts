import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAnalytics } from "@/state/analytics";
import type { AnalyticsEvents } from "@/state/analytics/events";
import { useSettingsLoad } from "@/state/settings";

/** `content.data` of every scheduled reminder. Marks taps as reminder taps. */
export const REMINDER_NOTIFICATION_DATA = { kind: "reminder" } as const;

/** Notification response API. Tests pass a fake. */
export interface NotificationResponseSource {
  getLastResponse: () => NotificationResponse | null;
  clearLastResponse: () => void;
  addResponseListener: (listener: (response: NotificationResponse) => void) => {
    remove: () => void;
  };
}

const nativeSource: NotificationResponseSource = {
  getLastResponse: Notifications.getLastNotificationResponse,
  clearLastResponse: Notifications.clearLastNotificationResponse,
  addResponseListener: Notifications.addNotificationResponseReceivedListener,
};

const webSource: NotificationResponseSource = {
  getLastResponse: () => null,
  clearLastResponse: () => null,
  addResponseListener: () => ({ remove: () => null }),
};

const defaultSource = Platform.OS === "web" ? webSource : nativeSource;

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

/** One key per delivery: daily repeats share the identifier, not the date. */
const getDeliveryKey = (response: NotificationResponse) =>
  `${response.notification.request.identifier}:${response.notification.date}`;

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
export const useReminderTapTracking = (
  source: NotificationResponseSource = defaultSource
) => {
  const analytics = useAnalytics();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const pending = useRef<
    { response: NotificationResponse; coldStart: boolean }[]
  >([]);
  const seen = useRef(new Set<string>());

  const flush = useEffectEvent(() => {
    if (!isSettingsReady) {
      return;
    }

    const taps = pending.current;
    pending.current = [];
    for (const { response, coldStart } of taps) {
      analytics.track(
        "reminders:notification_opened",
        getReminderTapProperties(response, { coldStart, now: Date.now() })
      );
    }
  });

  const enqueue = useEffectEvent(
    (response: NotificationResponse, coldStart: boolean) => {
      if (!isReminderTap(response)) {
        return;
      }

      const key = getDeliveryKey(response);
      if (seen.current.has(key)) {
        return;
      }

      seen.current.add(key);
      pending.current.push({ response, coldStart });
      flush();
    }
  );

  // Layout effect: read the launch response before any listener event.
  useLayoutEffect(() => {
    const launchResponse = source.getLastResponse();
    if (launchResponse && isReminderTap(launchResponse)) {
      enqueue(launchResponse, true);
      // A later remount in this process must not count it again.
      source.clearLastResponse();
    }

    const subscription = source.addResponseListener((response) => {
      enqueue(response, false);
    });
    return () => {
      subscription.remove();
    };
  }, [source]);

  useEffect(() => {
    if (isSettingsReady) {
      flush();
    }
  }, [isSettingsReady]);
};
