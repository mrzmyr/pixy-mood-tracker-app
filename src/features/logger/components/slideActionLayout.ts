import { Platform } from "react-native";
import { FLOAT_BUTTON_SIZE } from "@/constants/FloatButton";

/** iOS keyboard height includes a strip the button may overlap. */
export const KEYBOARD_OVERLAP = Platform.OS === "ios" ? 20 : 0;
/** Space under the button, added to the bottom safe area inset. */
export const BUTTON_PADDING = 16;

/**
 * Height from the keyboard top to the top edge of the next/save button while
 * the keyboard is open. Content that must stay clear of the button reserves it.
 */
export const getActionHeightAboveKeyboard = (insetsBottom: number) =>
  FLOAT_BUTTON_SIZE + insetsBottom + BUTTON_PADDING - KEYBOARD_OVERLAP;
