import { Platform } from "react-native";

/**
 * Width and height of `FloatButton`: Material 3 FAB on Android (56 dp),
 * 54 pt on iOS.
 */
export const FLOAT_BUTTON_SIZE = Platform.OS === "android" ? 56 : 54;
