import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { Platform } from "react-native";

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

/** Expo notification responses on native, none on web. */
export const defaultNotificationResponseSource =
  Platform.OS === "web" ? webSource : nativeSource;

/** One key per delivery: daily repeats share the identifier, not the date. */
export const getDeliveryKey = (response: NotificationResponse) =>
  `${response.notification.request.identifier}:${response.notification.date}`;

/** One selected notification tap. */
export interface NotificationTap<T> {
  value: T;
  response: NotificationResponse;
  /** `true` for the response that launched the app. */
  coldStart: boolean;
}

/**
 * Collects taps that `select` accepts and hands them to `onTaps` once
 * `isReady` is `true`.
 *
 * - Cold start: the response that launched the app (`coldStart: true`)
 * - Warm start: taps while the app runs or sits in background
 * - One tap per delivery, also when the listener repeats the launch response
 * - Clears the launch response only when `select` accepts it, so other
 *   hooks still see their own
 * - No-op on web
 */
export const useNotificationTaps = <T>({
  select,
  isReady,
  onTaps,
  source = defaultNotificationResponseSource,
}: {
  /** Value of a tap this hook handles. `null` ignores the response. */
  select: (response: NotificationResponse) => T | null;
  isReady: boolean;
  /** Taps in arrival order. Never empty. */
  onTaps: (taps: NotificationTap<T>[]) => void;
  source?: NotificationResponseSource;
}) => {
  const pending = useRef<NotificationTap<T>[]>([]);
  const seen = useRef(new Set<string>());

  const flush = useEffectEvent(() => {
    if (!isReady || pending.current.length === 0) {
      return;
    }

    const taps = pending.current;
    pending.current = [];
    onTaps(taps);
  });

  /** Whether `select` accepts the response. */
  const enqueue = useEffectEvent(
    (response: NotificationResponse, coldStart: boolean) => {
      const value = select(response);
      if (value === null) {
        return false;
      }

      const key = getDeliveryKey(response);
      if (!seen.current.has(key)) {
        seen.current.add(key);
        pending.current.push({ value, response, coldStart });
        flush();
      }
      return true;
    }
  );

  // Layout effect: read the launch response before any listener event.
  useLayoutEffect(() => {
    const launchResponse = source.getLastResponse();
    if (launchResponse && enqueue(launchResponse, true)) {
      // A later remount in this process must not handle it again.
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
    if (isReady) {
      flush();
    }
  }, [isReady]);
};
