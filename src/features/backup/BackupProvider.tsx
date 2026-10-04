import * as Sentry from "@sentry/react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildExportData,
  toExportSettings,
  useDatagate,
} from "@/features/datagate";
import { useLogState } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { askToRestoreBackup, askToTurnOffBackup } from "@/helpers/prompts";
import {
  createMissingProviderError,
  createStructuredError,
} from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
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
  isAvailable,
  readBackupFile,
  resume,
  writeBackupFile,
} from "./cloud";
import type { BackupProvider as Provider } from "./cloud";
import { cloudFailureSchema, isOfflineFailure } from "./failure";
import type { CloudFailure } from "./failure";

/** Wait after the last change before writing, so typing does not upload. */
export const AUTO_BACKUP_DELAY_MS = 3000;

/**
 * - `off`: switch off
 * - `idle`: on and up to date, or waiting for the next change
 * - `syncing`: writing the backup file
 * - `unavailable`: iCloud Drive off or no internet
 * - `signedOut`: Google Drive session gone, user must turn backup on again
 * - `incompatible`: the cloud file comes from a newer Pixy; never overwritten
 * - `error`: last read or write failed (details in Sentry)
 */
export type BackupStatus =
  | "off"
  | "idle"
  | "syncing"
  | "unavailable"
  | "signedOut"
  | "incompatible"
  | "error";

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
  const { deviceId } = settings;

  const [status, setStatus] = useState<BackupStatus>("off");
  const [remote, setRemote] = useState<BackupFile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastWritten = useRef<string | null>(null);
  /** Failure codes already sent to Sentry this session: one report each. */
  const reported = useRef(new Set<string>());

  /**
   * Records a failed cloud call. Offline failures only pause backup: no
   * Sentry report, status `unavailable`. Other failures reach Sentry once
   * per code and session, so a phone without connection does not flood it.
   */
  const fail = useCallback(
    (failure: CloudFailure, code: string) => {
      if (isOfflineFailure(failure)) {
        analytics.track("backup:failed", { status: "backup_offline" });
        setStatus("unavailable");
        return;
      }
      if (!reported.current.has(code)) {
        reported.current.add(code);
        Sentry.captureException(
          createStructuredError({
            status: code,
            message: "Backup failed",
            why: failure.message ?? "The cloud call failed without a message",
            fix: "Check the internet connection and iCloud or Google Drive settings. Pixy retries on the next change.",
          })
        );
      }
      analytics.track("backup:failed", { status: code });
      setStatus("error");
    },
    [analytics]
  );
  const failInEffect = useEffectEvent((failure: CloudFailure, code: string) =>
    fail(failure, code)
  );

  /** Reads the cloud backup. `isStopped` drops results after unmount. */
  const load = useCallback(
    async (isStopped: () => boolean) => {
      try {
        if (!(await resume())) {
          if (!isStopped()) {
            setStatus("signedOut");
          }
          return;
        }
        if (!(await isAvailable())) {
          if (!isStopped()) {
            setStatus("unavailable");
          }
          return;
        }
        const text = await readBackupFile();
        if (isStopped()) {
          return;
        }
        const file = text === null ? null : parseBackupFile(text);
        if (text !== null && file === null) {
          // A newer Pixy wrote the file, or it is damaged. Never replace it:
          // this version would drop data it does not understand.
          setRemote(null);
          setIsReady(false);
          setStatus("incompatible");
          return;
        }
        setRemote(file);
        setStatus("idle");
        setIsReady(true);
      } catch (error) {
        if (!isStopped()) {
          fail(cloudFailureSchema.parse(error), "backup_read_failed");
        }
      }
    },
    [fail]
  );

  // Load the cloud backup whenever backup turns on.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let isCancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect -- load awaits iCloud or Google Drive before any setState; this effect syncs with that external system
    load(() => isCancelled);
    return () => {
      isCancelled = true;
    };
  }, [enabled, load]);

  // Avatars are files, so the key compares avatar paths. The write inlines them.
  const dataKey = useMemo(
    () =>
      JSON.stringify({
        items,
        tags,
        people,
        settings: toExportSettings(settings),
      }),
    [items, tags, people, settings]
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
      })
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      setStatus("syncing");
      try {
        await resume();
        const data = await buildExportData({ items, tags, people, settings });
        const file = createBackupFile({ data, deviceId });
        await writeBackupFile(JSON.stringify(file));
        lastWritten.current = dataKey;
        setRemote(file);
        setStatus("idle");
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
    dataKey,
    items,
    tags,
    people,
    settings,
    remote,
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
    [analytics, fail, setSettings, status]
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
      await askToRestoreBackup();
    } catch {
      return;
    }
    try {
      // Wait for every store: until then local data is still the old data,
      // and claiming the backup now would let the next write replace it.
      await datagate.import(remote.data, { muted: false });
    } catch (error) {
      fail(cloudFailureSchema.parse(error), "backup_restore_failed");
      return;
    }
    analytics.track("backup:restored");
    // Local data now matches the backup, so this phone may replace it.
    setRemote({ ...remote, deviceId });
  }, [remote, deviceId, datagate, analytics, fail]);

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
