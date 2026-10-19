import { requireOptionalNativeModule } from "expo-modules-core";
import type { EventSubscription } from "expo-modules-core";
import { Platform } from "react-native";

/** Native module in modules/pixy-mood-tracker-quick-check-in (Android only). */
interface QuickCheckInNativeModule {
  start: (plan: string) => void;
  stop: () => void;
  readInbox: () => string;
  clearInbox: (imported: string) => void;
  addListener: (
    event: "onInboxChanged",
    listener: () => void
  ) => EventSubscription;
}

/** `null` on iOS, and on Android builds without the module. */
export const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<QuickCheckInNativeModule>("PixyQuickCheckIn")
    : null;
