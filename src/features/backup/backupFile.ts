import { z } from "zod";
import { pixySchema } from "@/features/datagate";
import type { ExportData } from "@/features/datagate";

/**
 * Backup file contents: the normal export plus where and when it was made.
 * `data` stays a plain export, so restore reuses the import flow.
 */
export interface BackupFile {
  pixyBackup: 1;
  /** `settings.deviceId` of the phone that wrote the file. */
  deviceId: string;
  /** ISO time of the write. Shown as "Last sync". */
  createdAt: string;
  data: ExportData;
}

/** Wraps an export in a backup file. */
export const createBackupFile = ({
  data,
  deviceId,
  now = new Date(),
}: {
  data: ExportData;
  deviceId: string;
  now?: Date;
}): BackupFile => ({
  pixyBackup: 1,
  deviceId,
  createdAt: now.toISOString(),
  data,
});

const backupFileSchema = z.object({
  pixyBackup: z.literal(1),
  deviceId: z.string(),
  createdAt: z.string(),
  // Same check as the import dialog, so a restore never fails validation.
  data: z.custom<ExportData>((value) => pixySchema.safeParse(value).success),
});

/**
 * Parses backup file text. Returns `null` for anything that is not a valid
 * Pixy backup.
 */
export const parseBackupFile = (text: string): BackupFile | null => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const result = backupFileSchema.safeParse(json);
  return result.success ? result.data : null;
};

/**
 * Whether this phone may replace the backup in the cloud.
 *
 * Never replace a backup with nothing. Replace another phone's backup only
 * when this phone has at least as many entries. Otherwise a fresh install
 * with one entry would wipe years of backup before the user can restore.
 */
export const canReplaceBackup = ({
  existing,
  deviceId,
  localItemCount,
}: {
  existing: BackupFile | null;
  deviceId: string;
  localItemCount: number;
}): boolean => {
  if (localItemCount === 0) {
    return false;
  }
  if (existing === null || existing.deviceId === deviceId) {
    return true;
  }
  return localItemCount >= existing.data.items.length;
};
