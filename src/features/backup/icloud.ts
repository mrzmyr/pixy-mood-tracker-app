import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { createFileCloud } from "./cloud";
import type { BackupCloud } from "./cloud";

let storage: CloudStorage | null = null;

// Created on first use: the constructor throws on Android.
const getStorage = () => {
  storage ??= new CloudStorage(CloudStorageProvider.ICloud);
  return storage;
};

/**
 * Backup file in the hidden app folder of the user's iCloud Drive (iOS).
 * Needs no sign-in: the Apple Account of the phone owns the folder.
 */
export const icloudCloud: BackupCloud = {
  connect: () => Promise.resolve(true),
  resume: () => Promise.resolve(true),
  disconnect: () => Promise.resolve(),
  ...createFileCloud({ storage: getStorage }),
};
