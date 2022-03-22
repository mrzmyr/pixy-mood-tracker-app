import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { NotificationRequestInput, SchedulableNotificationTriggerInput } from 'expo-notifications';

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

  const schedule = async (options: NotificationRequestInput) => {
    console.log('scheduleNotification', options);
    await Notifications.scheduleNotificationAsync(options);
  }

  const unschedule = async (identifier: string) => {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  const cancelAll = async () => {
    console.log('cancelNotifications');
    await Notifications.cancelAllScheduledNotificationsAsync()
  }
  
  return {
    hasPermission,
    askForPermission,
    schedule,
    cancelAll,
    getScheduled,
  }
}

export default useNotification;