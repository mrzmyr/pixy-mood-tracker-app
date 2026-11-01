import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";
import type { useAnalytics } from "@/state/analytics";
import { parseBackupFile } from "./backup-file";
import type { BackupFile } from "./backup-file";
import type { BackupCloud } from "./cloud";
import {
  cloudFailureSchema,
  isOfflineFailure,
  SIGNED_OUT_STATUS,
} from "./failure";
import type { CloudFailure } from "./failure";

/**
 * - `off`: switch off
 * - `idle`: on and up to date, or waiting for the next change
 * - `syncing`: writing the backup file
 * - `unavailable`: iCloud Drive off or no internet
 * - `signedOut`: Google Drive session gone, user must sign in again
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

/**
 * The cloud side of the backup: reads the file from `cloud` when backup
 * turns on and on every return to the app, and turns failures into a status.
 * `cloud` is `null` while backup is off.
 *
 * `isReady` is `true` only after a successful read. Writes wait for it, so a
 * file this version cannot parse is never replaced.
 */
export const useCloudFile = ({
  cloud,
  analytics,
}: {
  cloud: BackupCloud | null;
  analytics: ReturnType<typeof useAnalytics>;
}) => {
  const [status, setStatus] = useState<BackupStatus>("off");
  const [remote, setRemote] = useState<BackupFile | null>(null);
  const [isReady, setIsReady] = useState(false);
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
      // Revoked Google access needs a new sign-in, not a bug report.
      if (failure.status === SIGNED_OUT_STATUS) {
        analytics.track("backup:failed", { status: SIGNED_OUT_STATUS });
        setStatus("signedOut");
        return;
      }
      if (!reported.current.has(code)) {
        reported.current.add(code);
        const error = createStructuredError({
          status: code,
          message: "Backup failed",
          why:
            failure.why ??
            failure.message ??
            "The cloud call failed without a message",
          fix: "Check the internet connection and iCloud or Google Drive settings. Pixy retries on the next change.",
        });
        reportError(error);
      }
      analytics.track("backup:failed", { status: code });
      setStatus("error");
    },
    [analytics]
  );

  /** Reads the cloud backup. `isStopped` drops results after unmount. */
  const load = useCallback(
    async (isStopped: () => boolean) => {
      if (cloud === null) {
        return;
      }
      try {
        if (!(await cloud.resume())) {
          if (!isStopped()) {
            setStatus("signedOut");
          }
          return;
        }
        if (!(await cloud.isAvailable())) {
          if (!isStopped()) {
            setStatus("unavailable");
          }
          return;
        }
        const text = await cloud.readBackupFile();
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
    [cloud, fail]
  );

  // Load the cloud backup whenever backup turns on or the cloud changes. Only then: `load`
  // changes with every settings change (through `analytics`), and a read
  // after each write would replace the file just written.
  const loadOnEnable = useEffectEvent((isStopped: () => boolean) =>
    load(isStopped)
  );
  useEffect(() => {
    if (cloud === null) {
      return;
    }
    let isCancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect -- load awaits iCloud or Google Drive before any setState; this effect syncs with that external system
    loadOnEnable(() => isCancelled);
    return () => {
      isCancelled = true;
    };
  }, [cloud]);

  // Coming back to the app: read the cloud again. Another phone may have
  // written since, and a failed or unavailable cloud may work again now.
  const reloadOnForeground = useEffectEvent((isStopped: () => boolean) => {
    if (status !== "syncing" && status !== "off") {
      load(isStopped);
    }
  });
  useEffect(() => {
    if (cloud === null) {
      return;
    }
    let isCancelled = false;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        reloadOnForeground(() => isCancelled);
      }
    });
    return () => {
      isCancelled = true;
      subscription.remove();
    };
  }, [cloud]);

  return {
    status,
    setStatus,
    remote,
    setRemote,
    isReady,
    setIsReady,
    fail,
    load,
  };
};
