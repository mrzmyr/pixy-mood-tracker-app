import { useMemo } from "react";
import { Platform } from "react-native";
import { useFeatureFlag } from "@/state/feature-flags";
import type { FeatureFlag } from "@/state/feature-flags/keys";
import type { BackupProviderSetting } from "@/state/settings";
import type { BackupCloud } from "./cloud";
import { googleDriveCloud, isGoogleDriveConfigured } from "./google-drive";
import { icloudCloud } from "./icloud";

/** Cloud that holds the backup. iCloud exists on iOS only. */
export type BackupProvider = BackupProviderSetting;

/**
 * Clouds a user can pick, in screen order. Each needs its own feature flag:
 * - iOS: iCloud (`backup-ios-icloud`), Google Drive (`backup-ios-google-drive`)
 * - Android: Google Drive (`backup-android-google-drive`)
 *
 * Google Drive also needs an OAuth client for this build
 * ({@link isGoogleDriveConfigured}). Empty list: no Backup row, no cloud
 * read or write.
 */
export const useBackupProviders = (): BackupProvider[] => {
  const isIosICloudOn = useFeatureFlag("backup-ios-icloud");
  const isIosGoogleDriveOn = useFeatureFlag("backup-ios-google-drive");
  const isAndroidGoogleDriveOn = useFeatureFlag("backup-android-google-drive");
  const isICloudOn = Platform.OS === "ios" && isIosICloudOn;
  const isGoogleDriveOn =
    (Platform.OS === "ios" ? isIosGoogleDriveOn : isAndroidGoogleDriveOn) &&
    isGoogleDriveConfigured();
  // Stable identity: the backup context value depends on it.
  return useMemo(() => {
    const providers: BackupProvider[] = [];
    if (isICloudOn) {
      providers.push("icloud");
    }
    if (isGoogleDriveOn) {
      providers.push("googledrive");
    }
    return providers;
  }, [isICloudOn, isGoogleDriveOn]);
};

/** Feature flag that offers `provider` on this platform. */
export const getBackupFlag = (provider: BackupProvider): FeatureFlag => {
  if (provider === "icloud") {
    return "backup-ios-icloud";
  }
  return Platform.OS === "ios"
    ? "backup-ios-google-drive"
    : "backup-android-google-drive";
};

const SYSTEM_CLOUDS: Record<BackupProvider, BackupCloud> = {
  icloud: icloudCloud,
  googledrive: googleDriveCloud,
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

/** Cloud operations of `provider`, or the development override. */
export const getBackupCloud = (provider: BackupProvider): BackupCloud =>
  override ?? SYSTEM_CLOUDS[provider];
