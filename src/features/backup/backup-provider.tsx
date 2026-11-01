import dayjs from "dayjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
} from "react";
import { useContentStableValue } from "@/hooks/use-content-stable-value";
import { useAppData, useDatagate } from "@/features/datagate";
import { useLogLoad, useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { createMissingProviderError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { toExportSettings } from "@/state/settings/export-settings";
import type { SettingsState } from "@/state/settings";
import {
  canReplaceBackup,
  createBackupFile,
  parseBackupFile,
} from "./backup-file";
import type { BackupFile } from "./backup-file";
import { cloudFailureSchema } from "./failure";
import type { CloudFailure } from "./failure";
import {
  askToRestoreBackup,
  askToTurnOffBackup,
  showBackupNotDeleted,
} from "./prompts";
import { getBackupCloud, useBackupProviders } from "./providers";
import type { BackupProvider as Provider } from "./providers";
import { useCloudFile } from "./use-cloud-file";
import pkg from "../../../package.json";
import type { BackupStatus } from "./use-cloud-file";

export type { BackupStatus } from "./use-cloud-file";

/** Wait after the last change before writing, so typing does not upload. */
export const AUTO_BACKUP_DELAY_MS = 3000;

/** Marker for "the data changed since the last write". Identity only. */
type DataRevision = object;

/**
 * Restoring must not undo onboarding on this phone: a done onboarding stays
 * done. Analytics consent is a device setting, so imports keep it anyway.
 */
const keepOnboarding = (
  data: BackupFile["data"],
  current: Pick<SettingsState, "actionsDone">
): BackupFile["data"] => {
  const onboarding = current.actionsDone.find(
    (action) => action.title === "onboarding"
  );
  const hasOnboarding = data.settings.actionsDone.some(
    (action) => action.title === "onboarding"
  );
  return {
    ...data,
    settings: {
      ...data.settings,
      actionsDone:
        onboarding && !hasOnboarding
          ? [...data.settings.actionsDone, onboarding]
          : data.settings.actionsDone,
    },
  };
};

/** Backup state and actions for the Backup screen. */
export interface BackupValue {
  /** Clouds this build offers, from the feature flags. Empty: no backup. */
  providers: Provider[];
  /** Cloud the user turned on, or `null` while backup is off. */
  provider: Provider | null;
  /**
   * Backup runs: the user turned a cloud on and its feature flag is on.
   * Stays on while signed out or unavailable.
   */
  enabled: boolean;
  status: BackupStatus;
  /** ISO time of the backup in the cloud, or `null` when there is none. */
  lastBackupAt: string | null;
  /**
   * Restore is offered only while auto-backup is paused: this phone has no
   * entries, or the cloud holds a bigger backup from another phone. Then
   * restoring cannot discard newer local changes.
   */
  canRestore: boolean;
  /**
   * Why restore is offered: this phone has no entries (new phone or
   * reinstall), or another phone wrote a bigger or newer backup. `null`
   * when restore is not offered.
   */
  restoreReason: "noEntries" | "otherPhone" | null;
  /** Turns backup on in `provider`. Google Drive signs in first. */
  turnOn: (provider: Provider) => Promise<void>;
  /** Turns backup off after confirmation and deletes the cloud backup. */
  turnOff: () => Promise<void>;
  /** Replaces local data with the cloud backup after confirmation. */
  restore: () => Promise<void>;
  /** Signs in to Google Drive again after the session ended. */
  reconnect: () => Promise<void>;
}

// SAFETY: every consumer renders inside BackupProvider; the default is never read.
const BackupContext = createContext<BackupValue>(undefined as never);

/**
 * Keeps one backup file of all entries, tags, people, and settings in the
 * hidden app folder of the cloud the user picked: iCloud or Google Drive on
 * iOS, Google Drive on Android. See docs/backup.md.
 *
 * Each cloud has its own feature flag ({@link useBackupProviders}). Flag off:
 * no read or write in that cloud, even when `backupProvider` names it.
 *
 * Must render inside the settings, analytics, feature flags, logs, tags, and
 * people providers.
 */
export const BackupProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings, setSettings } = useSettings();
  const isSettingsLoaded = useSettingsLoad().status === "ready";
  const { items } = useLogState();
  const isLogsLoaded = useLogLoad().status === "ready";
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const datagate = useDatagate();
  const appData = useAppData();
  const analytics = useAnalytics();
  const providers = useBackupProviders();
  const { deviceId, backupWrittenAt, backupProvider: provider } = settings;
  const isProviderOn = provider !== null && providers.includes(provider);
  const enabled = isSettingsLoaded && isProviderOn;
  const cloud = isProviderOn ? getBackupCloud(provider) : null;

  const {
    status,
    setStatus,
    remote,
    setRemote,
    isReady,
    setIsReady,
    fail,
    load,
  } = useCloudFile({ cloud: enabled ? cloud : null, analytics });
  const lastWritten = useRef<DataRevision | null>(null);
  const failInEffect = useEffectEvent((failure: CloudFailure, code: string) =>
    fail(failure, code)
  );
  // Reads the data of the latest render when the timer fires.
  const snapshotInEffect = useEffectEvent(() => appData.snapshot());
  const setSettingsInEffect = useEffectEvent(
    (update: (current: SettingsState) => SettingsState) => setSettings(update)
  );

  // Only exported settings count as a change; the device-only fields do not.
  const exportSettings = useContentStableValue(toExportSettings(settings));
  // A new object whenever backed-up data changes. Identity is enough: the
  // write compares it with the last written one. No serialization of every
  // entry on every change.
  const dataKey = useMemo<DataRevision>(
    () => ({ items, tags, people, exportSettings }),
    [items, tags, people, exportSettings]
  );

  // Write the backup a short time after local data changes. `enabled` stops
  // writes when the feature flag turns off during the session.
  useEffect(() => {
    if (
      cloud === null ||
      !enabled ||
      !isReady ||
      !isLogsLoaded ||
      deviceId === null ||
      dataKey === lastWritten.current
    ) {
      return;
    }
    if (
      !canReplaceBackup({
        existing: remote,
        deviceId,
        localItemCount: items.length,
        lastWrittenAt: backupWrittenAt,
      })
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      setStatus("syncing");
      try {
        await cloud.resume();
        // Read again right before writing: another phone may have written
        // since the last read. Then its file wins and backup pauses here.
        const text = await cloud.readBackupFile();
        const latest = text === null ? null : parseBackupFile(text);
        if (text !== null && latest === null) {
          setRemote(null);
          setIsReady(false);
          setStatus("incompatible");
          return;
        }
        if (
          !canReplaceBackup({
            existing: latest,
            deviceId,
            localItemCount: items.length,
            lastWrittenAt: backupWrittenAt,
          })
        ) {
          setRemote(latest);
          setStatus("idle");
          return;
        }
        const file = createBackupFile({
          backup: await snapshotInEffect(),
          version: pkg.version,
          deviceId,
        });
        await cloud.writeBackupFile(JSON.stringify(file));
        lastWritten.current = dataKey;
        setRemote(file);
        setStatus("idle");
        setSettingsInEffect((current) => ({
          ...current,
          backupWrittenAt: file.createdAt,
        }));
      } catch (error) {
        failInEffect(cloudFailureSchema.parse(error), "backup_write_failed");
      }
    }, AUTO_BACKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    cloud,
    enabled,
    isReady,
    isLogsLoaded,
    deviceId,
    backupWrittenAt,
    dataKey,
    items,
    remote,
    setStatus,
    setRemote,
    setIsReady,
  ]);

  const turnOn = useCallback(
    async (next: Provider) => {
      // One cloud at a time: turn the other one off first. Never a cloud
      // whose feature flag is off.
      if (enabled || !providers.includes(next)) {
        return;
      }
      try {
        if (!(await getBackupCloud(next).connect())) {
          return;
        }
      } catch (error) {
        fail(cloudFailureSchema.parse(error), "backup_sign_in_failed");
        return;
      }
      analytics.track("settings:backup_toggled", {
        enabled: true,
        provider: next,
      });
      setSettings((current) => ({ ...current, backupProvider: next }));
    },
    [analytics, enabled, fail, providers, setSettings]
  );

  const turnOff = useCallback(async () => {
    if (provider === null || !enabled) {
      return;
    }
    try {
      await askToTurnOffBackup();
    } catch {
      return;
    }
    const current = getBackupCloud(provider);
    // Turning off always works on this phone. Only deleting the cloud copy
    // can fail (offline, no Drive access): then the user learns where to
    // delete it by hand.
    let isDeleted = false;
    try {
      // Deleting needs a session. Without it the file would stay behind.
      if (status !== "signedOut" || (await current.connect())) {
        await current.deleteBackupFile();
        isDeleted = true;
      }
    } catch (error) {
      fail(cloudFailureSchema.parse(error), "backup_delete_failed");
    }
    try {
      await current.disconnect();
    } catch {
      // Signing out only ends the Google session; backup is off either way.
    }
    if (!isDeleted) {
      showBackupNotDeleted(provider);
    }
    setIsReady(false);
    setRemote(null);
    setStatus("off");
    lastWritten.current = null;
    analytics.track("settings:backup_toggled", { enabled: false, provider });
    setSettings((settingsNow) => ({ ...settingsNow, backupProvider: null }));
  }, [
    analytics,
    enabled,
    fail,
    provider,
    setSettings,
    status,
    setStatus,
    setRemote,
    setIsReady,
  ]);

  const reconnect = useCallback(async () => {
    if (cloud === null) {
      return;
    }
    try {
      if (await cloud.connect()) {
        await load(() => false);
      }
    } catch (error) {
      fail(cloudFailureSchema.parse(error), "backup_sign_in_failed");
    }
  }, [cloud, fail, load]);

  const restore = useCallback(async () => {
    if (remote === null || deviceId === null) {
      return;
    }
    try {
      await askToRestoreBackup({
        localCount: items.length,
        backupCount: remote.data.items.length,
        backupAge: dayjs(remote.createdAt).fromNow(),
      });
    } catch {
      return;
    }
    try {
      // Wait for every store: until then local data is still the old data,
      // and claiming the backup now would let the next write replace it.
      await datagate.import(keepOnboarding(remote.data, settings), {
        muted: false,
      });
    } catch (error) {
      fail(cloudFailureSchema.parse(error), "backup_restore_failed");
      return;
    }
    analytics.track("backup:restored");
    // Local data now matches the backup, so this phone may replace it.
    setRemote({ ...remote, deviceId });
  }, [
    remote,
    deviceId,
    items.length,
    settings,
    datagate,
    analytics,
    fail,
    setRemote,
  ]);

  const canRestore =
    remote !== null &&
    deviceId !== null &&
    isLogsLoaded &&
    !canReplaceBackup({
      existing: remote,
      deviceId,
      localItemCount: items.length,
      lastWrittenAt: backupWrittenAt,
    });
  let restoreReason: BackupValue["restoreReason"] = null;
  if (canRestore) {
    restoreReason = items.length === 0 ? "noEntries" : "otherPhone";
  }

  const value = useMemo<BackupValue>(
    () => ({
      providers,
      provider,
      enabled,
      status,
      lastBackupAt: remote?.createdAt ?? null,
      canRestore,
      restoreReason,
      turnOn,
      turnOff,
      restore,
      reconnect,
    }),
    [
      providers,
      provider,
      enabled,
      status,
      remote,
      canRestore,
      restoreReason,
      turnOn,
      turnOff,
      restore,
      reconnect,
    ]
  );

  return (
    <BackupContext.Provider value={value}>{children}</BackupContext.Provider>
  );
};

/** Backup state and actions. Throws outside `BackupProvider`. */
export const useBackup = (): BackupValue => {
  const value = useContext(BackupContext);
  if (value === undefined) {
    throw createMissingProviderError("useBackup", "BackupProvider");
  }
  return value;
};
