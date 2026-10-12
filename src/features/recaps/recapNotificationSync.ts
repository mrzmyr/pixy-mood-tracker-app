import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { DATE_FORMAT } from "@/constants/Config";
import { defaultRecapScheduler } from "@/features/notifications";
import type {
  RecapNotificationRequest,
  RecapNotificationScheduler,
} from "@/features/notifications";
import { useWeekLocale } from "@/hooks/useWeekLocale";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useFeatureFlagState } from "@/state/featureFlags";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { getRecapNotifications } from "./recapNotifications";
import type { RecapNotificationKind } from "./recapNotifications";

const TITLES: Record<RecapNotificationKind, TranslationKey> = {
  week: "notification_recap_week_title",
  month: "notification_recap_month_title",
  year: "notification_recap_year_title",
};

const getToday = () => dayjs().format(DATE_FORMAT);

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
 * - Reschedules when the setting, the reminder time, or the week start
 *   changes, and on the first foreground of a new day
 * - Waits for stored settings and flags; never touches the schedule on a
 *   failed read
 */
export const useRecapNotificationSync = (
  scheduler: RecapNotificationScheduler = defaultRecapScheduler
) => {
  const { settings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const flag = useFeatureFlagState("recaps");
  const weekLocale = useWeekLocale();
  const [today, setToday] = useState(getToday);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setToday(getToday());
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const { recapNotificationsEnabled, reminderTime } = settings;

  useEffect(() => {
    if (!isSettingsReady || flag === "loading") {
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
    recapNotificationsEnabled,
    reminderTime,
    weekLocale,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- a new day reschedules, so the schedule keeps its weeks ahead.
    today,
    scheduler,
  ]);
};
