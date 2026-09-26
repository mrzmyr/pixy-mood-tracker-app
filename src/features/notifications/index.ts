import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type {
  NotificationContentInput,
  NotificationTriggerInput,
} from "expo-notifications";
import { Alert, Platform } from "react-native";
import { t } from "@/helpers/translation";

const isWeb = Platform.OS === "web";

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

/**
 * Repeating daily reminder trigger at the given local time.
 *
 * Daily triggers work on Android and iOS. Calendar triggers are iOS-only.
 * See https://docs.expo.dev/versions/latest/sdk/notifications/#calendartriggerinput
 */
export const createDailyTrigger = (
  hour: number,
  minute: number
): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour,
  minute,
});

const hasPermission = async (): Promise<boolean> => {
  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }
  Alert.alert("Alert", "Must use physical device for Push Notifications");

  return false;
};

const askForPermission = async (): Promise<boolean> => {
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  }
  Alert.alert("Alert", "Must use physical device for Push Notifications");

  return false;
};

const schedule = async (options: {
  content?: NotificationContentInput;
  trigger: NotificationTriggerInput;
}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t("notification_reminder_title"),
      body: t("notification_reminder_body"),
    },
    ...options,
  });
};

const cancelAll = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Module-level so the returned functions are stable across renders and safe
// to use as effect dependencies.
const notifications = isWeb
  ? {
      hasPermission: () => Promise.resolve(true),
      askForPermission: () => Promise.resolve(true),
      schedule: () => Promise.resolve(),
      cancelAll: () => Promise.resolve(),
    }
  : {
      hasPermission,
      askForPermission,
      schedule,
      cancelAll,
    };

const useNotification = () => notifications;

export default useNotification;
