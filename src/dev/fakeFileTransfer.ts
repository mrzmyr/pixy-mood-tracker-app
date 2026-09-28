import * as FileSystem from "expo-file-system/legacy";
import type { FileTransfer } from "@/features/datagate/fileTransfer";

const FILE = `${FileSystem.documentDirectory}fake-file-transfer.json`;

/**
 * Stands in for the share sheet and document picker in e2e runs: sharing
 * keeps the exported file, picking returns it. Export and import then round
 * trip without system screens.
 */
export const fakeFileTransfer: FileTransfer = {
  share: async (uri) => {
    await FileSystem.deleteAsync(FILE, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: FILE });
    return true;
  },
  pickJson: async () => {
    const info = await FileSystem.getInfoAsync(FILE);
    return info.exists ? FILE : null;
  },
};
