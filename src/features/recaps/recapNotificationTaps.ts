import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { z } from "zod";
import {
  defaultNotificationResponseSource,
  getDeliveryKey,
  RECAP_NOTIFICATION_TYPE,
} from "@/features/notifications";
import type { NotificationResponseSource } from "@/features/notifications";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlagState } from "@/state/featureFlags";
import { useSettingsLoad } from "@/state/settings";
import type { RecapNotificationKind } from "./recapNotifications";
import type { DateKey } from "./types";

/** Period a recap notification opens. */
export interface RecapTap {
  kind: RecapNotificationKind;
  date: DateKey;
}

const RecapDataSchema = z.object({
  type: z.literal(RECAP_NOTIFICATION_TYPE),
  kind: z.enum(["week", "month", "year"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
});

/**
 * Period of a tap on a recap notification body. `null` for other
 * notifications, dismisses, and other actions.
 */
export const getRecapTap = (
  response: NotificationResponse
): RecapTap | null => {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  const { data } = RecapDataSchema.safeParse(
    response.notification.request.content.data
  );
  return data ? { kind: data.kind, date: data.date } : null;
};

/**
 * Opens the recap of the period on a tap on a recap notification, and sends
 * `recaps:notification_tapped`.
 *
 * - Cold start: the response that launched the app
 * - Warm start: taps while the app runs or sits in background
 * - Waits for stored settings, flags, and navigation: the recap route
 *   redirects while flag `recaps` still loads
 * - Opens the route also while flag `recaps` is off; its gate redirects
 * - Navigates, so a tap on the recap already on screen adds no copy
 */
export const useRecapNotificationTaps = (
  source: NotificationResponseSource = defaultNotificationResponseSource
) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const flag = useFeatureFlagState("recaps");
  const isNavigationReady = Boolean(useRootNavigationState()?.key);
  const pending = useRef<RecapTap[]>([]);
  const seen = useRef(new Set<string>());

  const flush = useEffectEvent(() => {
    if (!isSettingsReady || !isNavigationReady || flag === "loading") {
      return;
    }
    const taps = pending.current;
    pending.current = [];
    for (const { kind } of taps) {
      analytics.track("recaps:notification_tapped", { period: kind });
    }
    const last = taps.at(-1);
    if (last) {
      router.navigate(`/recaps/${last.kind}/${last.date}`);
    }
  });

  const enqueue = useEffectEvent((response: NotificationResponse) => {
    const tap = getRecapTap(response);
    const key = getDeliveryKey(response);
    if (!tap || seen.current.has(key)) {
      return;
    }
    seen.current.add(key);
    pending.current.push(tap);
    flush();
  });

  // Layout effect: read the launch response before any listener event.
  useLayoutEffect(() => {
    const launchResponse = source.getLastResponse();
    if (launchResponse && getRecapTap(launchResponse)) {
      enqueue(launchResponse);
      // A later remount in this process must not open it again.
      source.clearLastResponse();
    }

    const subscription = source.addResponseListener((response) => {
      enqueue(response);
    });
    return () => {
      subscription.remove();
    };
  }, [source]);

  useEffect(() => {
    if (isSettingsReady && isNavigationReady && flag !== "loading") {
      flush();
    }
  }, [isSettingsReady, isNavigationReady, flag]);
};
