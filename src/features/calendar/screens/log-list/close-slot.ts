import type { Platform } from "react-native";

/**
 * Close slot of the day view's native header. iOS puts close on the right.
 * Android follows the Material 3 full-screen dialog: close on the left, title
 * after it.
 */
export const getCloseSlot = (os: typeof Platform.OS) =>
  os === "android" ? "headerLeft" : "headerRight";
