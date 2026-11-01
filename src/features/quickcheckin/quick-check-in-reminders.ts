import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  defaultNotificationResponseSource,
  defaultQuickCheckInScheduler,
  getDeliveryKey,
  QUICK_CHECK_IN_NOTIFICATION_TYPE,
} from "@/features/notifications";
import type {
  NotificationResponseSource,
  QuickCheckInNotificationScheduler,
} from "@/features/notifications";
import { useLogLoad, useLogState } from "@/features/logs";
import { useToday } from "@/hooks/use-today";
import { createStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlagState } from "@/state/feature-flags";
import { useSettings, useSettingsLoad } from "@/state/settings";
import {
  getLastEntryAt,
  getQuickCheckInDates,
} from "./quick-check-in-schedule";

const reportScheduleError = (cause: unknown) => {
  const error = createStructuredError({
    status: "quick_check_in_schedule_failed",
    message: "Quick check-in notifications could not be scheduled",
    why: `expo-notifications failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Open Pixy again or turn Quick Check-ins off and on in Settings > Reminders",
  });
  console.error(error);
  reportError(error);
};

/**
 * Keeps scheduled quick check-in notifications in line with the schedule.
 *
 * - On, with flag `quick-check-in` on: schedules the next times of
 *   `quickCheckInSchedule`, skipping times right after the newest entry
 * - Off, or flag off: cancels them. Reminders and recaps stay
 * - Reschedules when the schedule or the newest entry changes, and on a
 *   new day
 * - Waits for stored settings, entries, and the flag; never touches the
 *   schedule on a failed read
 */
export const useQuickCheckInReminderSync = (
  scheduler: QuickCheckInNotificationScheduler = defaultQuickCheckInScheduler
) => {
  const { settings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const isLogsReady = useLogLoad().status === "ready";
  const { items } = useLogState();
  const flag = useFeatureFlagState("quick-check-in");
  const today = useToday();
  const lastEntryTime = getLastEntryAt(items)?.getTime() ?? null;
  const { quickCheckInEnabled, quickCheckInSchedule } = settings;
  const { from, until, everyHours } = quickCheckInSchedule;
  const schedule = useMemo(
    () => ({ from, until, everyHours }),
    [from, until, everyHours]
  );

  useEffect(() => {
    if (!isSettingsReady || !isLogsReady || flag === "loading") {
      return;
    }
    const isOn = quickCheckInEnabled && flag === "on";
    const sync = async () => {
      try {
        if (!isOn) {
          await scheduler.cancelAll();
          return;
        }
        const dates = getQuickCheckInDates({
          schedule,
          now: new Date(),
          lastEntryAt: lastEntryTime === null ? null : new Date(lastEntryTime),
        });
        await scheduler.replace(
          dates.map((at) => ({
            at,
            title: t("notification_quick_check_in_title"),
            body: t("notification_quick_check_in_body"),
          }))
        );
      } catch (error) {
        reportScheduleError(error);
      }
    };
    void sync();
  }, [
    isSettingsReady,
    isLogsReady,
    flag,
    quickCheckInEnabled,
    schedule,
    lastEntryTime,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- a new day reschedules, so the schedule keeps days ahead.
    today,
    scheduler,
  ]);
};

/** Whether the response is a tap on a quick check-in notification body. */
export const isQuickCheckInTap = (response: NotificationResponse) =>
  response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
  response.notification.request.content.data?.type ===
    QUICK_CHECK_IN_NOTIFICATION_TYPE;

/**
 * Opens the quick check-in screen on a tap on a quick check-in
 * notification, and sends `quick_check_in:notification_tapped`.
 *
 * - Cold start: the response that launched the app
 * - Warm start: taps while the app runs or sits in background
 * - Waits for stored settings and navigation
 */
export const useQuickCheckInNotificationTaps = (
  source: NotificationResponseSource = defaultNotificationResponseSource
) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const isNavigationReady = Boolean(useRootNavigationState()?.key);
  const pending = useRef<{ coldStart: boolean } | null>(null);
  const seen = useRef(new Set<string>());

  const flush = useEffectEvent(() => {
    if (!isSettingsReady || !isNavigationReady || pending.current === null) {
      return;
    }
    const { coldStart } = pending.current;
    pending.current = null;
    analytics.track("quick_check_in:notification_tapped", {
      cold_start: coldStart,
    });
    router.navigate("/check-in/new");
  });

  const enqueue = useEffectEvent(
    (response: NotificationResponse, coldStart: boolean) => {
      const key = getDeliveryKey(response);
      if (!isQuickCheckInTap(response) || seen.current.has(key)) {
        return;
      }
      seen.current.add(key);
      pending.current = { coldStart };
      flush();
    }
  );

  // Layout effect: read the launch response before any listener event.
  useLayoutEffect(() => {
    const launchResponse = source.getLastResponse();
    if (launchResponse && isQuickCheckInTap(launchResponse)) {
      enqueue(launchResponse, true);
      // A later remount in this process must not open it again.
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
    if (isSettingsReady && isNavigationReady) {
      flush();
    }
  }, [isSettingsReady, isNavigationReady]);
};
