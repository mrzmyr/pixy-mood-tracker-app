import * as FileSystem from "expo-file-system/legacy";
import type { BackupCloud } from "@/features/backup";

const FILE = `${FileSystem.documentDirectory}fake-backup-cloud.json`;

/** Short wait, so "Syncing…" is visible in demos and e2e videos. */
const NETWORK_DELAY_MS = 800;

const wait = () =>
  // oxlint-disable-next-line promise/avoid-new -- setTimeout has no promise form in React Native
  new Promise<void>((resolve) => {
    setTimeout(resolve, NETWORK_DELAY_MS);
  });

/**
 * Stands in for iCloud and Google Drive in development and preview builds:
 * the "cloud" is one file in the app's documents folder, so a backup
 * survives "Delete all my data" and restore can be shown end to end.
 * Sign-in always succeeds.
 */
export const fakeBackupCloud: BackupCloud = {
  connect: () => Promise.resolve(true),
  resume: () => Promise.resolve(true),
  disconnect: () => Promise.resolve(),
  isAvailable: () => Promise.resolve(true),
  readBackupFile: async () => {
    const info = await FileSystem.getInfoAsync(FILE);
    return info.exists ? FileSystem.readAsStringAsync(FILE) : null;
  },
  writeBackupFile: async (contents) => {
    await wait();
    await FileSystem.writeAsStringAsync(FILE, contents);
  },
  deleteBackupFile: async () => {
    await wait();
    await FileSystem.deleteAsync(FILE, { idempotent: true });
  },
};
