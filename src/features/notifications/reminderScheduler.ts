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

/** Daily reminder notification API. Tests pass an in-memory fake. */
export interface ReminderScheduler {
  hasPermission: () => Promise<boolean>;
  /** Ask the user when permission is not granted yet. */
  requestPermission: () => Promise<boolean>;
  /** Replace all scheduled notifications with one daily reminder. */
  replaceDaily: (hour: number, minute: number) => Promise<void>;
  cancelAll: () => Promise<void>;
}

const alertNoDevice = () => {
  Alert.alert("Alert", "Must use physical device for Push Notifications");
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

const nativeScheduler: ReminderScheduler = {
  hasPermission: getNativePermission,
  requestPermission: requestNativePermission,
  replaceDaily: async (hour, minute) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t("notification_reminder_title"),
        body: t("notification_reminder_body"),
        data: REMINDER_NOTIFICATION_DATA,
      },
      // Daily triggers work on Android and iOS. Calendar triggers are iOS-only.
      // See https://docs.expo.dev/versions/latest/sdk/notifications/#dailytriggerinput
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  },
  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};

const webScheduler: ReminderScheduler = {
  hasPermission: () => Promise.resolve(true),
  requestPermission: () => Promise.resolve(true),
  replaceDaily: () => Promise.resolve(),
  cancelAll: () => Promise.resolve(),
};

/** Expo notifications on native, no-op on web. */
export const defaultReminderScheduler =
  Platform.OS === "web" ? webScheduler : nativeScheduler;
