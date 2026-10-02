import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useEffect, useEffectEvent, useRef } from "react";
import { Platform } from "react-native";
import { useAnalytics } from "@/state/analytics";

const MINUTE_MS = 60 * 1000;
const MAX_DELAY_MINUTES = 7 * 24 * 60;

/**
 * Minutes between delivery and tap, or `null` when the delivery time is
 * missing or implausible. Accepts seconds or milliseconds since epoch.
 */
export const getDelayMinutes = (deliveredAt: number, now: number) => {
  if (!Number.isFinite(deliveredAt) || deliveredAt <= 0) {
    return null;
  }
  const deliveredMs = deliveredAt < 1e12 ? deliveredAt * 1000 : deliveredAt;
  const minutes = Math.round((now - deliveredMs) / MINUTE_MS);
  return minutes < 0 || minutes > MAX_DELAY_MINUTES ? null : minutes;
};

/**
 * Track taps on reminder notifications and mark the session as started by
 * a reminder. Covers cold starts (last response) and taps while running.
 */
export const useReminderOpenTracking = () => {
  const analytics = useAnalytics();
  const handled = useRef(new Set<string>());

  const onResponse = useEffectEvent((response: NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    // Daily reminders reuse one request id; the delivery time tells taps apart.
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current.has(key)) {
      return;
    }
    handled.current.add(key);
    // The last response survives restarts; clear it so the next cold start
    // does not count this tap again.
    Notifications.clearLastNotificationResponse();

    analytics.setSessionSource("reminder");
    analytics.track("reminders:notification_opened", {
      delay_minutes: getDelayMinutes(response.notification.date, Date.now()),
    });
  });

  useEffect(() => {
    if (Platform.OS === "web" || !analytics.isEnabled) {
      return;
    }

    const last = Notifications.getLastNotificationResponse();
    if (last) {
      onResponse(last);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => subscription.remove();
  }, [analytics.isEnabled]);
};
