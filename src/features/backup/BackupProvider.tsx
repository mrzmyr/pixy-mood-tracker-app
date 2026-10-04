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
import { useContentStableValue } from "@/hooks/useContentStableValue";
import {
  buildExportData,
  toExportSettings,
  useDatagate,
} from "@/features/datagate";
import { useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { askToRestoreBackup, askToTurnOffBackup } from "@/helpers/prompts";
import { createMissingProviderError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import type { SettingsState } from "@/state/settings";
import {
  canReplaceBackup,
  createBackupFile,
  parseBackupFile,
} from "./backupFile";
import type { BackupFile } from "./backupFile";
import {
  connect,
  deleteBackupFile,
  disconnect,
  getBackupProvider,
  readBackupFile,
  resume,
  writeBackupFile,
} from "./cloud";
import type { BackupProvider as Provider } from "./cloud";
import { cloudFailureSchema } from "./failure";
import type { CloudFailure } from "./failure";
import { useCloudFile } from "./useCloudFile";
import type { BackupStatus } from "./useCloudFile";

export type { BackupStatus } from "./useCloudFile";

/** Wait after the last change before writing, so typing does not upload. */
export const AUTO_BACKUP_DELAY_MS = 3000;

/** Marker for "the data changed since the last write". Identity only. */
type DataRevision = object;

/**
 * Restoring must not change who consented on this phone: analytics stays as
 * set here, and a done onboarding stays done. Otherwise a backup from a phone
 * with analytics off would drop consent, unload the feature flags, and stop
 * backup on this phone in the middle of the restore.
 */
const keepConsent = (
  data: BackupFile["data"],
  current: Pick<SettingsState, "analyticsEnabled" | "actionsDone">
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
      analyticsEnabled: current.analyticsEnabled,
      actionsDone:
        onboarding && !hasOnboarding
          ? [...data.settings.actionsDone, onboarding]
          : data.settings.actionsDone,
    },
  };
};

/** Backup state and actions for the Backup screen. */
export interface BackupValue {
  provider: Provider;
  /** The user's switch. Stays on while signed out or unavailable. */
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
  /** Turns backup on (signs in on Android) or off (deletes the backup). */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Replaces local data with the cloud backup after confirmation. */
  restore: () => Promise<void>;
  /** Signs in to Google Drive again after the session ended. */
  reconnect: () => Promise<void>;
}

// SAFETY: every consumer renders inside BackupProvider; the default is never read.
const BackupContext = createContext<BackupValue>(undefined as never);

/**
 * Keeps one backup file of all entries, tags, people, and settings in the hidden
 * app folder of iCloud (iOS) or Google Drive (Android). See docs/backup.md.
 *
 * Off while the `backup` feature flag is off: no cloud read or write, even
 * when `backupEnabled` is on.
 *
 * Must render inside the settings, analytics, feature flags, logs, tags, and
 * people providers.
 */
export const BackupProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings, setSettings } = useSettings();
  const { items, loaded: isLogsLoaded = false } = useLogState();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const datagate = useDatagate();
  const analytics = useAnalytics();
  const isFeatureOn = useFeatureFlag("backup");
  const provider = getBackupProvider();
  const enabled = isFeatureOn && settings.loaded && settings.backupEnabled;
  const { deviceId, backupWrittenAt } = settings;

  const {
    status,
    setStatus,
    remote,
    setRemote,
    isReady,
    setIsReady,
    fail,
    load,
  } = useCloudFile({ enabled, analytics });
  const lastWritten = useRef<DataRevision | null>(null);
  const failInEffect = useEffectEvent((failure: CloudFailure, code: string) =>
    fail(failure, code)
  );
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
        await resume();
        // Read again right before writing: another phone may have written
        // since the last read. Then its file wins and backup pauses here.
        const text = await readBackupFile();
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
        const data = await buildExportData({ items, tags, people, settings });
        const file = createBackupFile({ data, deviceId });
        await writeBackupFile(JSON.stringify(file));
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
    enabled,
    isReady,
    isLogsLoaded,
    deviceId,
    backupWrittenAt,
    dataKey,
    items,
    tags,
    people,
    settings,
    remote,
    setStatus,
    setRemote,
    setIsReady,
  ]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        try {
          if (!(await connect())) {
            return;
          }
        } catch (error) {
          fail(cloudFailureSchema.parse(error), "backup_sign_in_failed");
          return;
        }
      } else {
        try {
          await askToTurnOffBackup();
        } catch {
          return;
        }
        try {
          // Deleting needs a session. Without it the file would stay behind.
          if (status === "signedOut" && !(await connect())) {
            return;
          }
          await deleteBackupFile();
          await disconnect();
        } catch (error) {
          fail(cloudFailureSchema.parse(error), "backup_delete_failed");
          return;
        }
        setIsReady(false);
        setRemote(null);
        setStatus("off");
        lastWritten.current = null;
      }
      analytics.track("settings:backup_toggled", { enabled: value });
      setSettings((current) => ({ ...current, backupEnabled: value }));
    },
    [analytics, fail, setSettings, status, setStatus, setRemote, setIsReady]
  );

  const reconnect = useCallback(async () => {
    try {
      if (await connect()) {
        await load(() => false);
      }
    } catch (error) {
      fail(cloudFailureSchema.parse(error), "backup_sign_in_failed");
    }
  }, [fail, load]);

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
      await datagate.import(keepConsent(remote.data, settings), {
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

  const value = useMemo<BackupValue>(
    () => ({
      provider,
      enabled,
      status,
      lastBackupAt: remote?.createdAt ?? null,
      canRestore:
        remote !== null &&
        deviceId !== null &&
        isLogsLoaded &&
        !canReplaceBackup({
          existing: remote,
          deviceId,
          localItemCount: items.length,
          lastWrittenAt: backupWrittenAt,
        }),
      setEnabled,
      restore,
      reconnect,
    }),
    [
      provider,
      enabled,
      status,
      remote,
      deviceId,
      backupWrittenAt,
      isLogsLoaded,
      items.length,
      setEnabled,
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
