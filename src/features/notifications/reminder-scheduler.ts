import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";
import { t } from "@/lib/translation";
import { REMINDER_NOTIFICATION_DATA } from "./reminder-taps";

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
  /**
   * Replace all scheduled notifications, except recap notifications, with
   * one reminder per date.
   */
  replace: (dates: Date[]) => Promise<void>;
  /** Cancel all scheduled notifications except recap notifications. */
  cancelAll: () => Promise<void>;
}

/** `content.data.type` of recap notifications. Reminder changes keep them. */
export const RECAP_NOTIFICATION_TYPE = "recap";

/** One recap notification. `data` marks the period it opens. */
export interface RecapNotificationRequest {
  at: Date;
  title: string;
  body: string;
  data: { kind: string; date: string };
}

/** Recap notification API. Tests pass an in-memory fake. */
export interface RecapNotificationScheduler {
  /** Replace all scheduled recap notifications. Reminders stay. */
  replace: (requests: RecapNotificationRequest[]) => Promise<void>;
  /** Cancel all scheduled recap notifications. Reminders stay. */
  cancelAll: () => Promise<void>;
}

/**
 * `content.data.type` of quick check-in notifications. Reminder and recap
 * changes keep them.
 */
export const QUICK_CHECK_IN_NOTIFICATION_TYPE = "quick_check_in";

/** One quick check-in notification. */
export interface QuickCheckInNotificationRequest {
  at: Date;
  title: string;
  body: string;
}

/** Quick check-in notification API. Tests pass an in-memory fake. */
export interface QuickCheckInNotificationScheduler {
  /** Replace all scheduled quick check-ins. Reminders and recaps stay. */
  replace: (requests: QuickCheckInNotificationRequest[]) => Promise<void>;
  /** Cancel all scheduled quick check-ins. Reminders and recaps stay. */
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

const scheduleRecap = ({ at, title, body, data }: RecapNotificationRequest) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { ...data, type: RECAP_NOTIFICATION_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
    },
  });

const scheduleQuickCheckIn = ({
  at,
  title,
  body,
}: QuickCheckInNotificationRequest) =>
  Notifications.scheduleNotificationAsync({
    content: { title, body, data: { type: QUICK_CHECK_IN_NOTIFICATION_TYPE } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
    },
  });

const isRecapRequest = (request: Notifications.NotificationRequest) =>
  request.content.data?.type === RECAP_NOTIFICATION_TYPE;

const isQuickCheckInRequest = (request: Notifications.NotificationRequest) =>
  request.content.data?.type === QUICK_CHECK_IN_NOTIFICATION_TYPE;

/**
 * Cancel each scheduled notification that matches. Reminders, recaps, and
 * quick check-ins share the schedule, so none may cancel all. Older app versions
 * scheduled a repeating reminder without data; it counts as a reminder.
 */
const cancelWhere = async (
  matches: (request: Notifications.NotificationRequest) => boolean
) => {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const cancels: Promise<void>[] = [];
  for (const request of requests) {
    if (matches(request)) {
      cancels.push(
        Notifications.cancelScheduledNotificationAsync(request.identifier)
      );
    }
  }
  await Promise.all(cancels);
};

const isReminderRequest = (request: Notifications.NotificationRequest) =>
  !isRecapRequest(request) && !isQuickCheckInRequest(request);

const replaceNative = async (dates: Date[]) => {
  await cancelWhere(isReminderRequest);
  await Promise.all(dates.map(scheduleReminder));
};

const replaceRecapsNative = async (requests: RecapNotificationRequest[]) => {
  await cancelWhere(isRecapRequest);
  await Promise.all(requests.map(scheduleRecap));
};

const replaceQuickCheckInsNative = async (
  requests: QuickCheckInNotificationRequest[]
) => {
  await cancelWhere(isQuickCheckInRequest);
  await Promise.all(requests.map(scheduleQuickCheckIn));
};

// Runs one change at a time, reminders, recaps, and quick check-ins alike: overlapping changes
// would interleave cancel and schedule, and leave duplicates.
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
  cancelAll: () => serialize(() => cancelWhere(isReminderRequest)),
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

const nativeRecapScheduler: RecapNotificationScheduler = {
  replace: (requests) => serialize(() => replaceRecapsNative(requests)),
  cancelAll: () => serialize(() => cancelWhere(isRecapRequest)),
};

const webRecapScheduler: RecapNotificationScheduler = {
  replace: () => Promise.resolve(),
  cancelAll: () => Promise.resolve(),
};

/** Expo notifications on native, no-op on web. Shares the reminder queue. */
export const defaultRecapScheduler =
  Platform.OS === "web" ? webRecapScheduler : nativeRecapScheduler;

const nativeQuickCheckInScheduler: QuickCheckInNotificationScheduler = {
  replace: (requests) => serialize(() => replaceQuickCheckInsNative(requests)),
  cancelAll: () => serialize(() => cancelWhere(isQuickCheckInRequest)),
};

const webQuickCheckInScheduler: QuickCheckInNotificationScheduler = {
  replace: () => Promise.resolve(),
  cancelAll: () => Promise.resolve(),
};

/** Expo notifications on native, no-op on web. Shares the reminder queue. */
export const defaultQuickCheckInScheduler =
  Platform.OS === "web"
    ? webQuickCheckInScheduler
    : nativeQuickCheckInScheduler;
