import * as FileSystem from "expo-file-system/legacy";
import type { FileTransfer } from "@/features/datagate";

const FILE = `${FileSystem.documentDirectory}fake-file-transfer.json`;

/**
 * Stands in for the share sheet and document picker in e2e runs: sharing
 * keeps the exported contents, picking returns them. Export and import then
 * round trip without system screens.
 */
export const fakeFileTransfer: FileTransfer = {
  share: async (_filename, contents) => {
    await FileSystem.writeAsStringAsync(FILE, contents);
    return true;
  },
  pickJsonText: async () => {
    const info = await FileSystem.getInfoAsync(FILE);
    return info.exists ? await FileSystem.readAsStringAsync(FILE) : null;
  },
};
