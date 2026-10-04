import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";

/**
 * OS boundary of export and import: the share sheet and the document
 * picker. E2E runs swap it for a fake (`src/dev/fakeFileTransfer.ts`),
 * because the system screens are outside the app and tests cannot drive
 * them reliably.
 */
export interface FileTransfer {
  /** Hands a file to the user. Resolves `false` when sharing is unavailable. */
  share: (uri: string) => Promise<boolean>;
  /** Lets the user pick a JSON file. Resolves its URI, or `null` on cancel. */
  pickJson: () => Promise<string | null>;
}

const systemFileTransfer: FileTransfer = {
  share: async (uri) => {
    if (!(await Sharing.isAvailableAsync())) {
      return false;
    }
    const options = uri.endsWith(".csv")
      ? { mimeType: "text/csv", UTI: "public.comma-separated-values-text" }
      : { mimeType: "application/json", UTI: "public.json" };
    await Sharing.shareAsync(uri, options);
    return true;
  },
  pickJson: async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });
    return doc.canceled ? null : doc.assets[0].uri;
  },
};

let override: FileTransfer | null = null;

/** Replaces the system share sheet and picker until the app restarts. */
export const setFileTransferOverride = (fileTransfer: FileTransfer | null) => {
  override = fileTransfer;
};

/** Returns the active file transfer: the override, else the system one. */
export const getFileTransfer = () => override ?? systemFileTransfer;
