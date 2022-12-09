import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { NotificationContentInput, NotificationTriggerInput } from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '@/helpers/translation';

const isWeb = Platform.OS === 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const useNotification = () => {
  const getScheduled = async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  const hasPermission = async (): Promise<Boolean> => {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted'
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return false;
  }

  const askForPermission = async () => {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
      }
    } else {
      alert('Must use physical device for Push Notifications');
    }
  }

  const schedule = async (options: {
    content?: NotificationContentInput;
    trigger: NotificationTriggerInput;
  }) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notification_reminder_title'),
        body: t('notification_reminder_body'),
      },
      ...options,
    });
  }

  const cancelAll = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  return isWeb ? {
    hasPermission: () => true,
    askForPermission: () => { },
    schedule: () => { },
    cancelAll: () => { },
    getScheduled: () => { },
  } : {
    hasPermission,
    askForPermission,
    schedule,
    cancelAll,
    getScheduled,
  }
}

export default useNotification;