import { Platform } from "react-native";

/**
 * Voice mode needs on-device speech recognition: iOS, or Android 13+
 * (API 33). Web and older Android hide it.
 */
export const isVoiceModeSupported =
  Platform.OS === "ios" ||
  (Platform.OS === "android" && Number(Platform.Version) >= 33);
