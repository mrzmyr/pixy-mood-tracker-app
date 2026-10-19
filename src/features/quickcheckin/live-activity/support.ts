import { Platform } from "react-native";

/**
 * iOS 26 only: the layout and the `expo-widgets` patch are tested there,
 * and a later schedule needs `Activity.request(start:)`. Android uses an
 * ongoing notification.
 */
export const IS_LIVE_ACTIVITY_SUPPORTED =
  Platform.OS === "ios" && Number(String(Platform.Version).split(".")[0]) >= 26;
