import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { defaultRecapScheduler } from "@/features/notifications";
import type {
  RecapNotificationRequest,
  RecapNotificationScheduler,
} from "@/features/notifications";
import { useToday } from "@/hooks/use-today";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import {
  useFeatureFlagSource,
  useFeatureFlagsLoadFailed,
  useFeatureFlagState,
} from "@/state/feature-flags";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { getRecapNotifications } from "./recap-notifications";
import type { RecapNotificationKind } from "./recap-notifications";

const TITLES: Record<RecapNotificationKind, TranslationKey> = {
  week: "notification_recap_week_title",
  month: "notification_recap_month_title",
  year: "notification_recap_year_title",
};

/** Recap notification requests from `now`, with text in the app language. */
export const getRecapRequests = ({
  now,
  weekLocale,
  reminderTime,
}: {
  now: Date;
  weekLocale: string;
  reminderTime: string;
}): RecapNotificationRequest[] =>
  getRecapNotifications({ now, weekLocale, reminderTime }).map(
    ({ kind, periodEnd, at }) => ({
      at,
      title: t(TITLES[kind]),
      body: t("notification_recap_body"),
      data: { kind, date: periodEnd },
    })
  );

const reportScheduleError = (cause: unknown) => {
  const error = createStructuredError({
    status: "recap_notifications_schedule_failed",
    message: "Recap notifications could not be scheduled",
    why: `expo-notifications failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Open Pixy again or turn Recaps off and on in Settings > Reminder",
  });
  console.error(error);
  Sentry.captureException(error);
};

/**
 * Keeps scheduled recap notifications in line with settings.
 *
 * - On, with flag `recaps` on: schedules the last day of the coming weeks,
 *   months, and year at the reminder time
 * - Off, or flag `recaps` off: cancels recap notifications. Reminders stay
 * - A failed flag request keeps the schedule: it reads off without PostHog
 *   turning the flag off
 * - Reschedules when the setting, the reminder time, or the week start
 *   changes, and on a new day (`useToday`)
 * - Waits for stored settings and flags; never touches the schedule on a
 *   failed read
 */
export const useRecapNotificationSync = (
  scheduler: RecapNotificationScheduler = defaultRecapScheduler
) => {
  const { settings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const flag = useFeatureFlagState("recaps");
  const hasFlagLoadFailed = useFeatureFlagsLoadFailed();
  const flagSource = useFeatureFlagSource("recaps");
  // Only an override or a loaded PostHog flag may turn recaps off.
  const isFlagUnknown = hasFlagLoadFailed && flagSource === "remote";
  const weekLocale = useWeekLocale();
  const today = useToday();

  const { recapNotificationsEnabled, reminderTime } = settings;

  useEffect(() => {
    if (!isSettingsReady || flag === "loading") {
      return;
    }
    if (recapNotificationsEnabled && flag === "off" && isFlagUnknown) {
      return;
    }
    const isOn = recapNotificationsEnabled && flag === "on";
    const sync = async () => {
      try {
        await (isOn
          ? scheduler.replace(
              getRecapRequests({ now: new Date(), weekLocale, reminderTime })
            )
          : scheduler.cancelAll());
      } catch (error) {
        reportScheduleError(error);
      }
    };
    void sync();
  }, [
    isSettingsReady,
    flag,
    isFlagUnknown,
    recapNotificationsEnabled,
    reminderTime,
    weekLocale,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- a new day reschedules, so the schedule keeps its weeks ahead.
    today,
    scheduler,
  ]);
};
