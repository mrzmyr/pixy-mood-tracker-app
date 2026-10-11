import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import { t } from "@/lib/translation";
import { REMINDER_NOTIFICATION_DATA } from "./reminderTaps";

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

/** Reminder notification API. Tests pass an in-memory fake. */
export interface ReminderScheduler {
  hasPermission: () => Promise<boolean>;
  /** Ask the user when permission is not granted yet. */
  requestPermission: () => Promise<boolean>;
  /** Replace all scheduled notifications with one reminder per date. */
  replace: (dates: Date[]) => Promise<void>;
  cancelAll: () => Promise<void>;
}

const alertNoDevice = () => {
  Alert.alert(
    t("reminder_device_required_title"),
    t("reminder_device_required_message")
  );
};

const getNativePermission = async () => {
  if (!Device.isDevice) {
    alertNoDevice();
    return false;
  }
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
};

const requestNativePermission = async () => {
  if (!Device.isDevice) {
    alertNoDevice();
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

const scheduleReminder = (date: Date) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title: t("notification_reminder_title"),
      body: t("notification_reminder_body"),
      data: REMINDER_NOTIFICATION_DATA,
    },
    // One-shot date triggers, not a repeating daily trigger: days with an
    // entry get no reminder. Works on Android and iOS.
    // See https://docs.expo.dev/versions/latest/sdk/notifications/#datetriggerinput
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });

const replaceNative = async (dates: Date[]) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all(dates.map(scheduleReminder));
};

// Runs one change at a time: overlapping replace calls would interleave
// cancel and schedule, and leave duplicate reminders.
let pending: Promise<void> = Promise.resolve();

const settle = async (change: Promise<void>) => {
  try {
    await change;
  } catch {
    // A failed change must not block later ones; its caller saw the error.
  }
};

const serialize = (change: () => Promise<void>) => {
  const previous = pending;
  const next = (async () => {
    await settle(previous);
    await change();
  })();
  pending = next;
  return next;
};

const nativeScheduler: ReminderScheduler = {
  hasPermission: getNativePermission,
  requestPermission: requestNativePermission,
  replace: (dates) => serialize(() => replaceNative(dates)),
  cancelAll: () =>
    serialize(() => Notifications.cancelAllScheduledNotificationsAsync()),
};

const webScheduler: ReminderScheduler = {
  hasPermission: () => Promise.resolve(true),
  requestPermission: () => Promise.resolve(true),
  replace: () => Promise.resolve(),
  cancelAll: () => Promise.resolve(),
};

/** Expo notifications on native, no-op on web. */
export const defaultReminderScheduler =
  Platform.OS === "web" ? webScheduler : nativeScheduler;
