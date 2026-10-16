import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";

/**
 * How this device unlocks Pixy. `face` and `fingerprint` are iOS Face ID and
 * Touch ID. Android always reports `device`: its prompt picks fingerprint,
 * face, or screen lock itself. `none`: no passcode set, App Lock unavailable.
 */
export type UnlockMethod =
  | "face"
  | "fingerprint"
  | "passcode"
  | "device"
  | "none";

/** Reads how this device unlocks Pixy. Never throws: errors mean `none`. */
export const getUnlockMethod = async (): Promise<UnlockMethod> => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      return "none";
    }
    if (Platform.OS !== "ios") {
      return "device";
    }
    if (level === LocalAuthentication.SecurityLevel.SECRET) {
      return "passcode";
    }
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
      ? "face"
      : "fingerprint";
  } catch {
    return "none";
  }
};

/**
 * Result of one OS unlock prompt. `cancelled`: the user or the system closed
 * the prompt, so the lock screen shows no error.
 */
export type UnlockResult =
  | { status: "unlocked" }
  | { status: "cancelled" }
  | { status: "failed"; error: StructuredError };

const CANCEL_ERRORS = new Set(["user_cancel", "system_cancel", "app_cancel"]);

/**
 * Shows the OS prompt: biometrics first, device passcode as fallback, so the
 * user can always reach their data.
 */
export const authenticate = async (
  promptMessage: string
): Promise<UnlockResult> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: false,
    });
    if (result.success) {
      return { status: "unlocked" };
    }
    if (CANCEL_ERRORS.has(result.error)) {
      return { status: "cancelled" };
    }
    return {
      status: "failed",
      error: createStructuredError({
        status: result.error,
        message: "Device authentication failed",
        why: result.warning ?? `The OS prompt returned ${result.error}`,
        fix: "Try again, or unlock with the device passcode",
      }),
    };
  } catch (error) {
    return {
      status: "failed",
      error: createStructuredError({
        status: "unlock_prompt_failed",
        message: "Device authentication prompt could not open",
        why: error instanceof Error ? error.message : String(error),
        fix: "Try again, then restart Pixy",
      }),
    };
  }
};
