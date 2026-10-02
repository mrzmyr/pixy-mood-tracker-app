import { requireOptionalNativeModule } from "expo-modules-core";

interface PixyMoodTrackerBackupModule {
  setBackupEnabled: (enabled: boolean) => void;
  getLastBackupAt: () => number | null;
}

// Missing on web and in Jest. Then the switch has no effect and no date shows.
const native = requireOptionalNativeModule<PixyMoodTrackerBackupModule>(
  "PixyMoodTrackerBackup"
);

/**
 * Includes or excludes Pixy's stored data from the phone backup.
 *
 * - iOS: sets `isExcludedFromBackup` on the AsyncStorage folder. Call again
 *   after every launch, because AsyncStorage resets the flag on load.
 * - Android: stores the switch for the backup agent, which skips Pixy when off.
 */
export const setBackupEnabled = (enabled: boolean): void => {
  native?.setBackupEnabled(enabled);
};

/**
 * Time of the last Android cloud backup in milliseconds, or `null` when
 * unknown. Always `null` on iOS: iOS never reports backup times to apps.
 */
export const getLastBackupAt = (): number | null =>
  native?.getLastBackupAt() ?? null;
