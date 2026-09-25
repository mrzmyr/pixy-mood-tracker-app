import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type {
  NotificationContentInput,
  NotificationTriggerInput,
} from "expo-notifications";
import { Platform } from "react-native";
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

export const createDailyTrigger = (
  hour: number,
  minute: number
): Notifications.NotificationTriggerInput => ({
  type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
  repeats: true,
  hour,
  minute,
});

const getScheduled = async () =>
  await Notifications.getAllScheduledNotificationsAsync();

const hasPermission = async (): Promise<boolean> => {
  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }
  alert("Must use physical device for Push Notifications");

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
  alert("Must use physical device for Push Notifications");

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

const useNotification = () =>
  isWeb
    ? {
        hasPermission: () => Promise.resolve(true),
        askForPermission: () => Promise.resolve(true),
        schedule: async () => {},
        cancelAll: async () => {},
        getScheduled: () => Promise.resolve([]),
      }
    : {
        hasPermission,
        askForPermission,
        schedule,
        cancelAll,
        getScheduled,
      };

export default useNotification;
