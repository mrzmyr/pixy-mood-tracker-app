import { Platform } from "react-native";

/**
 * Width and height of `FloatButton`: Material 3 FAB on Android (56 dp),
 * 54 pt on iOS.
 */
export const FLOAT_BUTTON_SIZE = Platform.OS === "android" ? 56 : 54;

/**
 * Scale of a float button while it hides for an overlay, such as the voice
 * input pill. It fades out at the same time.
 */
export const FLOAT_BUTTON_HIDDEN_SCALE = 0.8;
