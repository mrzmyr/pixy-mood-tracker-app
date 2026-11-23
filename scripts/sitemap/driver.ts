// What a platform driver offers one capture (device.ts for iOS,
// device-android.ts for Android). attempt.ts drives only this interface.
import { APP_VARIANTS } from "../../app.config.ts";
import { CliError } from "../cli/shared.ts";
import type { Appearance } from "./profile.ts";
import type { Probes, RawNode } from "./tree.ts";

/** The capture app replaces the preview app; same app id and scheme. */
export const PREVIEW = APP_VARIANTS.preview;

/** Capture error: same four fields as every CLI error, plus a trap name. */
export class CaptureError extends CliError {
  /** Recoverable by a relaunch: the state runs once more. */
  isRetryable: boolean;

  constructor(
    fields: { status: string; message: string; why: string; fix: string },
    isRetryable = false
  ) {
    super(fields);
    this.name = "CaptureError";
    this.isRetryable = isRetryable;
  }
}

/** Device session of one capture run on one platform. */
export interface Driver {
  /** Text size, status bar, motion, permissions. Same on every host. */
  prepare: () => void;
  /** Undo prepare where it changes shared device settings. */
  restore: () => void;
  /** System light or dark mode. Applies at the next launch. */
  setAppearance: (appearance: Appearance) => void;
  /** Fresh app process, then an agent-device session. */
  launch: () => Promise<void>;
  pid: () => number | null;
  /** Seconds since the last launch: the app clock runs from launch. */
  secondsSinceLaunch: () => number;
  openUrl: (url: string) => void;
  openPath: (route: string) => void;
  snapshot: () => Promise<RawNode[]>;
  /** Poll probes until `isDone` holds. Returns the last probes and tree. */
  pollProbes: (
    isDone: (probes: Probes) => boolean,
    timeoutMs: number
  ) => Promise<{ probes: Probes; nodes: RawNode[]; isDone: boolean }>;
  waitFor: (selector: string, timeoutMs?: number) => Promise<void>;
  /** Text of the system alert on screen, or null. */
  readAlert: () => Promise<string | null>;
  /** PNG bytes of the screen, also written to `file`. */
  screenshot: (file: string) => Buffer;
  /** Crash report of the app since the last launch, or null. */
  findCrashReport: () => string | null;
}
