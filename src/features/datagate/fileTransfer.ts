import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { shareExportFile } from "./exportFile";

/**
 * OS boundary of export and import: the share sheet and the document
 * picker. E2E runs swap it for a fake (`src/dev/fakeFileTransfer.ts`),
 * because the system screens are outside the app and tests cannot drive
 * them reliably.
 */
export interface FileTransfer {
  /**
   * Hands a file named `filename` with `contents` to the user. Resolves
   * `false` when sharing is unavailable.
   */
  share: (filename: string, contents: string) => Promise<boolean>;
  /** Lets the user pick a JSON file. Resolves its text, or `null` on cancel. */
  pickJsonText: () => Promise<string | null>;
}

const openShareSheet = async (uri: string) => {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  const options = uri.endsWith(".csv")
    ? { mimeType: "text/csv", UTI: "public.comma-separated-values-text" }
    : { mimeType: "application/json", UTI: "public.json" };
  await Sharing.shareAsync(uri, options);
  return true;
};

const systemFileTransfer: FileTransfer = {
  share: (filename, contents) =>
    shareExportFile(filename, contents, openShareSheet),
  pickJsonText: async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    return doc.canceled
      ? null
      : await FileSystem.readAsStringAsync(doc.assets[0].uri);
  },
};

let override: FileTransfer | null = null;

/** Replaces the system share sheet and picker until the app restarts. */
export const setFileTransferOverride = (fileTransfer: FileTransfer | null) => {
  override = fileTransfer;
};

/** Returns the active file transfer: the override, else the system one. */
export const getFileTransfer = () => override ?? systemFileTransfer;

/**
 * In-memory adapter for tests. `shared` records every shared file;
 * `pickJsonText` returns `picked`.
 */
export const createMemoryFileTransfer = ({
  picked = null,
  isShareAvailable = true,
}: { picked?: string | null; isShareAvailable?: boolean } = {}) => {
  const shared: { filename: string; contents: string }[] = [];
  const fileTransfer: FileTransfer & { shared: typeof shared } = {
    shared,
    share: (filename, contents) => {
      if (isShareAvailable) {
        shared.push({ filename, contents });
      }
      return Promise.resolve(isShareAvailable);
    },
    pickJsonText: () => Promise.resolve(picked),
  };
  return fileTransfer;
};
