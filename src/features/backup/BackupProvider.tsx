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
import { buildExportData, useDatagate } from "@/features/datagate";
import { useLogState } from "@/features/logs";
import { useTagsState } from "@/features/tags";
import { askToRestoreBackup, askToTurnOffBackup } from "@/helpers/prompts";
import {
  createMissingProviderError,
  createStructuredError,
} from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
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

/** Wait after the last change before writing, so typing does not upload. */
export const AUTO_BACKUP_DELAY_MS = 3000;

/**
 * - `off`: switch off
 * - `idle`: on and up to date, or waiting for the next change
 * - `syncing`: writing the backup file
 * - `unavailable`: iCloud Drive off or no internet
 * - `signedOut`: Google Drive session gone, user must turn backup on again
 * - `error`: last read or write failed (details in Sentry)
 */
export type BackupStatus =
  | "off"
  | "idle"
  | "syncing"
  | "unavailable"
  | "signedOut"
  | "error";

/** Backup state and actions for the Backup screen. */
export interface BackupValue {
  provider: Provider;
  /** The user's switch. Stays on while signed out or unavailable. */
  enabled: boolean;
  status: BackupStatus;
  /** ISO time of the backup in the cloud, or `null` when there is none. */
  lastBackupAt: string | null;
  /** A backup exists in the cloud and can be restored. */
  hasBackup: boolean;
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
 * Keeps one backup file of all entries, tags, and settings in the hidden
 * app folder of iCloud (iOS) or Google Drive (Android). See docs/backup.md.
 *
 * Must render inside the settings, analytics, logs, and tags providers.
 */
export const BackupProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings, setSettings } = useSettings();
  const { items } = useLogState();
  const { tags } = useTagsState();
  const datagate = useDatagate();
  const analytics = useAnalytics();
  const provider = getBackupProvider();
  const enabled = settings.loaded && settings.backupEnabled;
  const { deviceId } = settings;

  const [status, setStatus] = useState<BackupStatus>("off");
  const [remote, setRemote] = useState<BackupFile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastWritten = useRef<string | null>(null);

  const fail = useCallback(
    (why: string, failure: string) => {
      Sentry.captureException(
        createStructuredError({
          status: failure,
          message: "Backup failed",
          why,
          fix: "Check the internet connection and iCloud or Google Drive settings. Pixy retries on the next change.",
        })
      );
      analytics.track("backup:failed", { status: failure });
      setStatus("error");
    },
    [analytics]
  );
  const failInEffect = useEffectEvent((why: string, failure: string) =>
    fail(why, failure)
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
        setRemote(text === null ? null : parseBackupFile(text));
        setStatus("idle");
        setIsReady(true);
      } catch (error) {
        if (!isStopped()) {
          fail(String(error), "backup_read_failed");
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

  const data = useMemo(
    () => buildExportData({ items, tags, settings }),
    [items, tags, settings]
  );
  const dataKey = useMemo(() => JSON.stringify(data), [data]);

  // Write the backup a short time after local data changes.
  useEffect(() => {
    if (!isReady || deviceId === null || dataKey === lastWritten.current) {
      return;
    }
    if (
      !canReplaceBackup({
        existing: remote,
        deviceId,
        localItemCount: data.items.length,
      })
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      setStatus("syncing");
      try {
        await resume();
        const file = createBackupFile({ data, deviceId });
        await writeBackupFile(JSON.stringify(file));
        lastWritten.current = dataKey;
        setRemote(file);
        setStatus("idle");
      } catch (error) {
        failInEffect(String(error), "backup_write_failed");
      }
    }, AUTO_BACKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isReady, deviceId, dataKey, data, remote]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        try {
          if (!(await connect())) {
            return;
          }
        } catch (error) {
          fail(String(error), "backup_sign_in_failed");
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
          fail(String(error), "backup_delete_failed");
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
      fail(String(error), "backup_sign_in_failed");
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
    datagate.import(remote.data, { muted: false });
    analytics.track("backup:restored");
    // Local data now matches the backup, so this phone may replace it.
    setRemote({ ...remote, deviceId });
  }, [remote, deviceId, datagate, analytics]);

  const value = useMemo<BackupValue>(
    () => ({
      provider,
      enabled,
      status,
      lastBackupAt: remote?.createdAt ?? null,
      hasBackup: remote !== null,
      setEnabled,
      restore,
      reconnect,
    }),
    [provider, enabled, status, remote, setEnabled, restore, reconnect]
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
