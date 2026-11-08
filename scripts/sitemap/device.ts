// Drives this checkout's simulator for one capture. Launch, links, and
// screenshots go through simctl, so the app runs with the fixed time zone
// and locale. Waits, taps, and trees go through agent-device.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS } from "../../app.config.ts";
import { agentDevice } from "../cli/agent-device.ts";
import { approveIosScheme } from "../cli/app-dev.ts";
import type { Device } from "../cli/device.ts";
import { CliError } from "../cli/shared.ts";
import { DEVICE_PROFILE } from "./profile.ts";
import { readProbes } from "./tree.ts";
import type { Probes, RawNode } from "./tree.ts";

/** The capture app replaces the preview app; same bundle ID and scheme. */
export const PREVIEW = APP_VARIANTS.preview;

const simctl = (args: string[], env?: Record<string, string>) =>
  execFileSync("xcrun", ["simctl", ...args], {
    encoding: "utf-8",
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  }).trim();

const trySimctl = (args: string[]) => {
  try {
    return simctl(args);
  } catch {
    return null;
  }
};

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

/** Simulator session of one capture run. */
export const createDriver = (device: Device, executable: string) => {
  const deviceArgs = ["--platform", "ios", "--udid", device.id];
  let launchedAt = 0;

  /** Appearance, text size, status bar, and permissions. Same on every host. */
  const prepare = () => {
    const { appearance, contentSize, statusBar } = DEVICE_PROFILE;
    simctl(["ui", device.id, "appearance", appearance]);
    simctl(["ui", device.id, "content_size", contentSize]);
    simctl([
      "status_bar",
      device.id,
      "override",
      "--time",
      statusBar.time,
      "--dataNetwork",
      statusBar.dataNetwork,
      "--wifiMode",
      statusBar.wifiMode,
      "--wifiBars",
      statusBar.wifiBars,
      "--cellularMode",
      statusBar.cellularMode,
      "--cellularBars",
      statusBar.cellularBars,
      "--batteryState",
      statusBar.batteryState,
      "--batteryLevel",
      statusBar.batteryLevel,
      "--operatorName",
      statusBar.operatorName,
    ]);
    // iOS Reduce Motion: sky, Pixy flight, and other `useReducedMotion`
    // loops stand still. Read at app launch, and capture relaunches per state.
    simctl([
      "spawn",
      device.id,
      "defaults",
      "write",
      "com.apple.Accessibility",
      "ReduceMotionEnabled",
      "-bool",
      "true",
    ]);
    // Location off: no passive place, no reverse geocoding.
    trySimctl(["privacy", device.id, "revoke", "location", PREVIEW.appId]);
    approveIosScheme(device.id, PREVIEW);
  };

  const pid = () => {
    const line = (trySimctl(["spawn", device.id, "launchctl", "list"]) ?? "")
      .split("\n")
      .find((entry) => entry.includes(`UIKitApplication:${PREVIEW.appId}[`));
    const value = Number(line?.split("\t")[0]);
    return Number.isInteger(value) && value > 0 ? value : null;
  };

  /** Fresh process with fixed time zone and locale, then an agent-device session. */
  const launch = async () => {
    trySimctl(["terminate", device.id, PREVIEW.appId]);
    launchedAt = Date.now();
    simctl(
      [
        "launch",
        device.id,
        PREVIEW.appId,
        "-AppleLanguages",
        `(${DEVICE_PROFILE.language})`,
        "-AppleLocale",
        DEVICE_PROFILE.locale,
      ],
      { SIMCTL_CHILD_TZ: DEVICE_PROFILE.timeZone }
    );
    // Without --relaunch, open binds to the running process.
    await agentDevice(["open", PREVIEW.appId, ...deviceArgs], {
      timeoutMs: 120_000,
    });
  };

  /** Seconds since the last launch: the app clock runs from launch. */
  const secondsSinceLaunch = () => (Date.now() - launchedAt) / 1000;

  const openUrl = (url: string) => {
    simctl(["openurl", device.id, url]);
  };

  const openPath = (route: string) =>
    openUrl(`${PREVIEW.scheme}://${route.replace(/^\//u, "")}`);

  const snapshot = async () => {
    const data = await agentDevice<{ nodes: RawNode[] }>(
      ["snapshot", "--force-full", ...deviceArgs],
      { timeoutMs: 60_000 }
    );
    return data.nodes ?? [];
  };

  /** Poll probes until `isDone` holds. Returns the last probes and tree. */
  const pollProbes = async (
    isDone: (probes: Probes) => boolean,
    timeoutMs: number
  ) => {
    const deadline = Date.now() + timeoutMs;
    let nodes: RawNode[] = [];
    let probes = readProbes(nodes);
    while (Date.now() < deadline) {
      // oxlint-disable-next-line no-await-in-loop -- poll the probes
      nodes = await snapshot();
      probes = readProbes(nodes);
      if (isDone(probes)) {
        return { probes, nodes, isDone: true };
      }
      // oxlint-disable-next-line no-await-in-loop -- poll the probes
      await sleep(250);
    }
    return { probes, nodes, isDone: false };
  };

  const waitFor = async (selector: string, timeoutMs = 15_000) => {
    await agentDevice(["wait", selector, String(timeoutMs), ...deviceArgs], {
      timeoutMs: timeoutMs + 15_000,
    });
  };

  const press = (selector: string) =>
    agentDevice(["press", selector, ...deviceArgs], { timeoutMs: 30_000 });

  const scroll = (direction: "up" | "down", until: string) =>
    agentDevice(["scroll", direction, "--until", until, ...deviceArgs], {
      timeoutMs: 60_000,
    });

  /** Text of the system alert on screen, or null. */
  const readAlert = async () => {
    try {
      const alert = await agentDevice<{ title?: string; message?: string }>(
        ["alert", "get", ...deviceArgs],
        { timeoutMs: 15_000 }
      );
      return [alert.title, alert.message].filter(Boolean).join(": ") || "alert";
    } catch {
      return null;
    }
  };

  const screenshot = (file: string) => {
    simctl(["io", device.id, "screenshot", "--type=png", file]);
    return fs.readFileSync(file);
  };

  /** Newest crash report of the app since the last launch, or null. */
  const findCrashReport = () => {
    const dir = path.join(os.homedir(), "Library", "Logs", "DiagnosticReports");
    if (!fs.existsSync(dir)) {
      return null;
    }
    const reports = fs
      .readdirSync(dir)
      .filter((file) => file.startsWith(executable) && file.endsWith(".ips"))
      .map((file) => path.join(dir, file))
      .filter((file) => fs.statSync(file).mtimeMs >= launchedAt)
      .toSorted((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return reports[0] ?? null;
  };

  return {
    prepare,
    launch,
    pid,
    secondsSinceLaunch,
    openUrl,
    openPath,
    snapshot,
    pollProbes,
    waitFor,
    press,
    scroll,
    readAlert,
    screenshot,
    findCrashReport,
  };
};

/** Simulator session from {@link createDriver}. */
export type Driver = ReturnType<typeof createDriver>;
