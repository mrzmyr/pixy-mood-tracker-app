import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import type { Notification } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { DATE_FORMAT } from "@/constants/config";
import { useLogLoad, useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";
import { getLoggedDays } from "./reminder-dates";
import { QUICK_CHECK_IN_NOTIFICATION_TYPE } from "./reminder-scheduler";
import { REMINDER_NOTIFICATION_DATA } from "./reminder-taps";

/** Delivered notifications in Notification Center or the tray. Tests pass a fake. */
export interface PresentedNotificationSource {
  list: () => Promise<Notification[]>;
  dismiss: (identifier: string) => Promise<void>;
}

const nativeSource: PresentedNotificationSource = {
  list: Notifications.getPresentedNotificationsAsync,
  dismiss: Notifications.dismissNotificationAsync,
};

const webSource: PresentedNotificationSource = {
  list: () => Promise.resolve([]),
  dismiss: () => Promise.resolve(),
};

/** Expo presented notifications on native, none on web. */
export const defaultPresentedNotificationSource =
  Platform.OS === "web" ? webSource : nativeSource;

/**
 * Identifiers of delivered notifications that an entry already answers.
 *
 * - Reminder: its delivery day has an entry
 * - Quick check-in: an entry at or after its delivery time exists
 * - Other notifications stay, recaps included
 */
export const getAnsweredNotificationIds = (
  notifications: readonly Notification[],
  items: readonly LogItem[]
): string[] => {
  const loggedDays = getLoggedDays([...items]);
  let lastEntryAt = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const time = Date.parse(item.dateTime);
    if (time > lastEntryAt) {
      lastEntryAt = time;
    }
  }

  const ids: string[] = [];
  for (const { date, request } of notifications) {
    const { data } = request.content;
    const isAnswered =
      data?.kind === REMINDER_NOTIFICATION_DATA.kind
        ? loggedDays.has(dayjs(date).format(DATE_FORMAT))
        : data?.type === QUICK_CHECK_IN_NOTIFICATION_TYPE &&
          lastEntryAt >= date;
    if (isAnswered) {
      ids.push(request.identifier);
    }
  }
  return ids;
};

/**
 * Removes delivered reminders and quick check-ins once an entry answers
 * them, so a person who opens Pixy from the home screen finds no stale
 * prompt afterwards.
 *
 * - Runs once entries load, then on each entry change
 * - A failed read or dismiss leaves the notifications; it never blocks entries
 */
export const useDismissAnsweredNotifications = (
  source: PresentedNotificationSource = defaultPresentedNotificationSource
) => {
  const { items } = useLogState();
  const isLogsReady = useLogLoad().status === "ready";

  useEffect(() => {
    if (!isLogsReady || items.length === 0) {
      return;
    }
    const dismissAnswered = async () => {
      try {
        const presented = await source.list();
        const ids = getAnsweredNotificationIds(presented, items);
        await Promise.all(ids.map((id) => source.dismiss(id)));
      } catch (cause) {
        const error = createStructuredError({
          status: "answered_notifications_dismiss_failed",
          message: "Answered notifications could not be dismissed",
          why: `expo-notifications failed: ${cause instanceof Error ? cause.message : String(cause)}`,
          fix: "Swipe the notification away. Pixy tries again after the next entry",
        });
        console.error(error);
        reportError(error);
      }
    };
    void dismissAnswered();
  }, [isLogsReady, items, source]);
};
