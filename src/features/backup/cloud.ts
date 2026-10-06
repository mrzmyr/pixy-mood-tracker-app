import {
  GoogleSignin,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { createStructuredError } from "@/lib/errors";
import {
  cloudFailureSchema,
  isOfflineFailure,
  OFFLINE_STATUS,
} from "./failure";
import type { CloudFailure } from "./failure";

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

/** Error for a failed cloud call without internet. Never sent to Sentry. */
const createOfflineError = (failure: CloudFailure) =>
  createStructuredError({
    status: OFFLINE_STATUS,
    message: "No connection to the cloud",
    why: failure.message ?? "The cloud call failed without a message",
    fix: "Pixy retries when the phone is online again.",
  });

/**
 * Error for a failed cloud call: `backup_offline` without internet, else the
 * given status. Every cloud function throws through this, so callers see one
 * error shape.
 */
const createCloudError = (
  failure: CloudFailure,
  status: string,
  message: string
) =>
  isOfflineFailure(failure)
    ? createOfflineError(failure)
    : createStructuredError({
        status,
        message,
        why: failure.message ?? "The cloud call failed without a message",
        fix: "Check the internet connection and iCloud or Google Drive settings. Pixy retries on the next change.",
      });

/** Whether the user granted Drive access, not only the sign-in. */
const hasDriveScope = (scopes: readonly string[]) =>
  scopes.some((scope) => scope === DRIVE_APPDATA_SCOPE);

const applyGoogleToken = async () => {
  const { accessToken } = await GoogleSignin.getTokens();
  CloudStorage.setProviderOptions({ accessToken });
};

/**
 * Signs in to Google Drive with a sign-in sheet. Resolves `false` when the
 * user cancels or does not allow Drive access. iCloud needs no sign-in and
 * resolves `true`.
 */
const systemConnect = async (): Promise<boolean> => {
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
    let { scopes } = response.data;
    if (!hasDriveScope(scopes)) {
      // Google's consent screen leaves the Drive checkbox unticked. A user who
      // only taps Continue signs in without Drive access: ask once more.
      const added = await GoogleSignin.addScopes({
        scopes: [DRIVE_APPDATA_SCOPE],
      });
      if (added !== null && isSuccessResponse(added)) {
        ({ scopes } = added.data);
      }
    }
    if (!hasDriveScope(scopes)) {
      // Without Drive access every write fails: stay off instead.
      await GoogleSignin.signOut();
      return false;
    }
    await applyGoogleToken();
    return true;
  } catch (error) {
    throw createCloudError(
      cloudFailureSchema.parse(error),
      "backup_sign_in_failed",
      "Could not sign in to Google Drive"
    );
  }
};

/**
 * Restores the Google Drive session without UI and refreshes the access
 * token. Resolves `false` when the user is not signed in anymore.
 */
const systemResume = async (): Promise<boolean> => {
  if (!isGoogleDrive()) {
    return true;
  }
  configureGoogle();
  try {
    const response = await GoogleSignin.signInSilently();
    // No session, or Drive access withdrawn: the user must sign in again.
    if (
      isNoSavedCredentialFoundResponse(response) ||
      !hasDriveScope(response.data.scopes)
    ) {
      return false;
    }
    await applyGoogleToken();
    return true;
  } catch (error) {
    const failure = cloudFailureSchema.parse(error);
    // Access revoked in the Google account, or the account was removed from
    // the phone: the user must sign in again.
    if (failure.code === statusCodes.SIGN_IN_REQUIRED) {
      return false;
    }
    throw createCloudError(
      failure,
      "backup_resume_failed",
      "Could not restore the Google Drive session"
    );
  }
};

/** Signs out of Google Drive. No-op on iCloud. */
const systemDisconnect = async (): Promise<void> => {
  if (isGoogleDrive()) {
    configureGoogle();
    await GoogleSignin.signOut();
    CloudStorage.setProviderOptions({ accessToken: null });
  }
};

/** `false` when iCloud Drive is off or Google Drive has no token. */
const systemIsAvailable = (): Promise<boolean> =>
  CloudStorage.isCloudAvailable();

/** Writes the backup file. Replaces an existing one. */
const systemWriteBackupFile = async (contents: string): Promise<void> => {
  try {
    await CloudStorage.writeFile(BACKUP_FILE, contents);
  } catch (error) {
    throw createCloudError(
      cloudFailureSchema.parse(error),
      "backup_write_failed",
      "Could not write the backup file"
    );
  }
};

/** Reads the backup file, or `null` when there is none. */
const systemReadBackupFile = async (): Promise<string | null> => {
  try {
    return (await CloudStorage.exists(BACKUP_FILE))
      ? await CloudStorage.readFile(BACKUP_FILE)
      : null;
  } catch (error) {
    throw createCloudError(
      cloudFailureSchema.parse(error),
      "backup_read_failed",
      "Could not read the backup file"
    );
  }
};

/** Deletes the backup file. No-op when there is none. */
const systemDeleteBackupFile = async (): Promise<void> => {
  try {
    if (await CloudStorage.exists(BACKUP_FILE)) {
      await CloudStorage.unlink(BACKUP_FILE);
    }
  } catch (error) {
    throw createCloudError(
      cloudFailureSchema.parse(error),
      "backup_delete_failed",
      "Could not delete the backup file"
    );
  }
};

/** Cloud operations behind the backup. Development builds can swap them. */
export interface BackupCloud {
  connect: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
  readBackupFile: () => Promise<string | null>;
  writeBackupFile: (contents: string) => Promise<void>;
  deleteBackupFile: () => Promise<void>;
}

const systemCloud: BackupCloud = {
  connect: systemConnect,
  resume: systemResume,
  disconnect: systemDisconnect,
  isAvailable: systemIsAvailable,
  readBackupFile: systemReadBackupFile,
  writeBackupFile: systemWriteBackupFile,
  deleteBackupFile: systemDeleteBackupFile,
};

let override: BackupCloud | null = null;

/**
 * Replaces iCloud and Google Drive until the app restarts. Used by the
 * `dev/fake-cloud` link in development and preview builds, where no Apple
 * Account or Google OAuth client exists.
 */
export const setBackupCloudOverride = (cloud: BackupCloud | null) => {
  override = cloud;
};

const active = () => override ?? systemCloud;

/** Signs in where needed. Resolves `false` when the user cancels. */
export const connect = () => active().connect();
/** Restores the session without UI. Resolves `false` when signed out. */
export const resume = () => active().resume();
/** Ends the session. No-op on iCloud. */
export const disconnect = () => active().disconnect();
/** `false` when iCloud Drive is off or Google Drive has no token. */
export const isAvailable = () => active().isAvailable();
/** Reads the backup file, or `null` when there is none. */
export const readBackupFile = () => active().readBackupFile();
/** Writes the backup file. Replaces an existing one. */
export const writeBackupFile = (contents: string) =>
  active().writeBackupFile(contents);
/** Deletes the backup file. No-op when there is none. */
export const deleteBackupFile = () => active().deleteBackupFile();
