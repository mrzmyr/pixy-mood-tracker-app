import * as Sentry from "@sentry/react-native";
import * as native from "../../modules/pixy-mood-tracker-backup/src";
import { createStructuredError } from "@/lib/errors";

/**
 * Applies the backup switch to the OS. Never throws: a failure only goes to
 * Sentry, because the stored setting stays correct and the next launch
 * applies it again.
 */
export const applyBackupEnabled = (enabled: boolean): void => {
  try {
    native.setBackupEnabled(enabled);
  } catch (error) {
    Sentry.captureException(
      createStructuredError({
        status: "backup_flag_failed",
        message: "Could not change the phone backup setting",
        why: String(error),
        fix: "Restart Pixy. The app applies the setting again on launch.",
      })
    );
  }
};

/**
 * Time of the last Android cloud backup in milliseconds, or `null` when
 * unknown. Always `null` on iOS.
 */
export const getLastBackupAt = (): number | null => native.getLastBackupAt();
