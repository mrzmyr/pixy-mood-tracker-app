import {
  GoogleSignin,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { CloudStorage, CloudStorageProvider } from "react-native-cloud-storage";
import { z } from "zod";
import { createFileCloud } from "./cloud";
import type { BackupCloud } from "./cloud";
import {
  cloudFailureSchema,
  createCloudError,
  DRIVE_SIGN_IN_REJECTED,
} from "./failure";

/** Hidden Google Drive folder that only Pixy can open. */
const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

/**
 * iOS OAuth client of this app variant, from `extra.googleIosClientId` in
 * `app.config.ts`. `null` until the client exists. Android needs no id: Play
 * services match the package and signing key.
 */
const getIosClientId = (): string | null =>
  z.string().min(1).safeParse(Constants.expoConfig?.extra?.googleIosClientId)
    .data ?? null;

/**
 * Whether Google Sign-In works in this build. iOS needs an OAuth client for
 * the bundle id. Without it, sign-in crashes, so Pixy hides Google Drive.
 */
export const isGoogleDriveConfigured = (): boolean =>
  Platform.OS !== "ios" || getIosClientId() !== null;

let storage: CloudStorage | null = null;

const getStorage = () => {
  storage ??= new CloudStorage(CloudStorageProvider.GoogleDrive);
  return storage;
};

let isGoogleConfigured = false;

const configureGoogle = () => {
  if (!isGoogleConfigured) {
    GoogleSignin.configure({
      scopes: [DRIVE_APPDATA_SCOPE],
      iosClientId: getIosClientId() ?? undefined,
    });
    isGoogleConfigured = true;
  }
};

/** Whether the user granted Drive access, not only the sign-in. */
const hasDriveScope = (scopes: readonly string[]) =>
  scopes.some((scope) => scope === DRIVE_APPDATA_SCOPE);

let googleToken: string | null = null;

const applyGoogleToken = async () => {
  const { accessToken } = await GoogleSignin.getTokens();
  googleToken = accessToken;
  getStorage().setProviderOptions({ accessToken });
};

/**
 * Runs a Google Drive call. When Drive rejects the token, drops it from the
 * Google Sign-In cache, so the next sign-in fetches a new one instead of
 * reusing the rejected token.
 */
const withGoogleToken = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    const failure = cloudFailureSchema.parse(error);
    if (failure.code === DRIVE_SIGN_IN_REJECTED && googleToken !== null) {
      await GoogleSignin.clearCachedAccessToken(googleToken);
      googleToken = null;
    }
    throw error;
  }
};

/**
 * Signs in to Google Drive with a sign-in sheet. Resolves `false` when the
 * user cancels or does not allow Drive access.
 */
const connect = async (): Promise<boolean> => {
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
const resume = async (): Promise<boolean> => {
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

/** Signs out of Google and forgets the token. */
const disconnect = async (): Promise<void> => {
  configureGoogle();
  await GoogleSignin.signOut();
  getStorage().setProviderOptions({ accessToken: null });
  googleToken = null;
};

/**
 * Backup file in the hidden app folder of the user's Google Drive. Signs in
 * with Google Sign-In, scope `drive.appdata`. See docs/backup.md.
 */
export const googleDriveCloud: BackupCloud = {
  connect,
  resume,
  disconnect,
  ...createFileCloud({ storage: getStorage, wrap: withGoogleToken }),
};
