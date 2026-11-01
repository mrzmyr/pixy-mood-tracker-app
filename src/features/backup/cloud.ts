import type { CloudStorage } from "react-native-cloud-storage";
import { cloudFailureSchema, createCloudError } from "./failure";

/** Backup file in the hidden app folder of iCloud or Google Drive. */
export const BACKUP_FILE = "pixy-mood-tracker-backup.json";

/** Cloud operations behind the backup. Development builds can swap them. */
export interface BackupCloud {
  /** Signs in where needed. Resolves `false` when the user cancels. */
  connect: () => Promise<boolean>;
  /** Restores the session without UI. Resolves `false` when signed out. */
  resume: () => Promise<boolean>;
  /** Ends the session. No-op on iCloud. */
  disconnect: () => Promise<void>;
  /** `false` when iCloud Drive is off or Google Drive has no token. */
  isAvailable: () => Promise<boolean>;
  /** Reads the backup file, or `null` when there is none. */
  readBackupFile: () => Promise<string | null>;
  /** Writes the backup file. Replaces an existing one. */
  writeBackupFile: (contents: string) => Promise<void>;
  /** Deletes the backup file. No-op when there is none. */
  deleteBackupFile: () => Promise<void>;
}

/** Runs one cloud call. Google Drive uses it to drop a rejected token. */
type CallWrapper = <T>(call: () => Promise<T>) => Promise<T>;

const runCall: CallWrapper = (call) => call();

/**
 * File operations on `storage`. Each failure throws a structured error with
 * a `backup_*` status ({@link createCloudError}).
 */
export const createFileCloud = ({
  storage,
  wrap = runCall,
}: {
  /** Created on first use: iCloud storage throws on Android. */
  storage: () => CloudStorage;
  wrap?: CallWrapper;
}): Pick<
  BackupCloud,
  "isAvailable" | "readBackupFile" | "writeBackupFile" | "deleteBackupFile"
> => ({
  isAvailable: () => storage().isCloudAvailable(),
  writeBackupFile: async (contents) => {
    try {
      await wrap(() => storage().writeFile(BACKUP_FILE, contents));
    } catch (error) {
      throw createCloudError(
        cloudFailureSchema.parse(error),
        "backup_write_failed",
        "Could not write the backup file"
      );
    }
  },
  readBackupFile: async () => {
    try {
      return await wrap(async () =>
        (await storage().exists(BACKUP_FILE))
          ? storage().readFile(BACKUP_FILE)
          : null
      );
    } catch (error) {
      throw createCloudError(
        cloudFailureSchema.parse(error),
        "backup_read_failed",
        "Could not read the backup file"
      );
    }
  },
  deleteBackupFile: async () => {
    try {
      await wrap(async () => {
        if (await storage().exists(BACKUP_FILE)) {
          await storage().unlink(BACKUP_FILE);
        }
      });
    } catch (error) {
      throw createCloudError(
        cloudFailureSchema.parse(error),
        "backup_delete_failed",
        "Could not delete the backup file"
      );
    }
  },
});
