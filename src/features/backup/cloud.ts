import {
  GoogleSignin,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { createStructuredError } from "@/lib/errors";

/** Backup file in the hidden app folder of iCloud or Google Drive. */
export const BACKUP_FILE = "pixy-mood-tracker-backup.json";

/** Hidden Google Drive folder that only Pixy can open. */
const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

/** Cloud that holds the backup. iCloud exists on iOS only. */
export type BackupProvider = "icloud" | "googledrive";

/** iCloud on iOS, Google Drive everywhere else. */
export const getBackupProvider = (): BackupProvider =>
  Platform.OS === "ios" ? "icloud" : "googledrive";

const isGoogleDrive = () =>
  CloudStorage.getProvider() === CloudStorageProvider.GoogleDrive;

let isGoogleConfigured = false;

const configureGoogle = () => {
  if (!isGoogleConfigured) {
    GoogleSignin.configure({ scopes: [DRIVE_APPDATA_SCOPE] });
    isGoogleConfigured = true;
  }
};

const applyGoogleToken = async () => {
  const { accessToken } = await GoogleSignin.getTokens();
  CloudStorage.setProviderOptions({ accessToken });
};

/**
 * Signs in to Google Drive with a sign-in sheet. Resolves `false` when the
 * user cancels. iCloud needs no sign-in and resolves `true`.
 */
export const connect = async (): Promise<boolean> => {
  if (!isGoogleDrive()) {
    return true;
  }
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return false;
    }
    await applyGoogleToken();
    return true;
  } catch (error) {
    throw createStructuredError({
      status: "backup_sign_in_failed",
      message: "Could not sign in to Google Drive",
      why: String(error),
      fix: "Check the internet connection and Google Play services, then turn backup on again.",
    });
  }
};

/**
 * Restores the Google Drive session without UI and refreshes the access
 * token. Resolves `false` when the user is not signed in anymore.
 */
export const resume = async (): Promise<boolean> => {
  if (!isGoogleDrive()) {
    return true;
  }
  configureGoogle();
  const response = await GoogleSignin.signInSilently();
  if (isNoSavedCredentialFoundResponse(response)) {
    return false;
  }
  await applyGoogleToken();
  return true;
};

/** Signs out of Google Drive. No-op on iCloud. */
export const disconnect = async (): Promise<void> => {
  if (isGoogleDrive()) {
    configureGoogle();
    await GoogleSignin.signOut();
    CloudStorage.setProviderOptions({ accessToken: null });
  }
};

/** `false` when iCloud Drive is off or Google Drive has no token. */
export const isAvailable = (): Promise<boolean> =>
  CloudStorage.isCloudAvailable();

/** Writes the backup file. Replaces an existing one. */
export const writeBackupFile = (contents: string): Promise<void> =>
  CloudStorage.writeFile(BACKUP_FILE, contents);

/** Reads the backup file, or `null` when there is none. */
export const readBackupFile = async (): Promise<string | null> =>
  (await CloudStorage.exists(BACKUP_FILE))
    ? CloudStorage.readFile(BACKUP_FILE)
    : null;

/** Deletes the backup file. No-op when there is none. */
export const deleteBackupFile = async (): Promise<void> => {
  if (await CloudStorage.exists(BACKUP_FILE)) {
    await CloudStorage.unlink(BACKUP_FILE);
  }
};
