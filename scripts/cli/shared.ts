// Shared types, state paths, and helpers for `bun devices`, `bun sessions`,
// and `bun builds`. State lives in ~/.cache/pixy/devices (override with
// PIXY_DEVICES_DIR), so every checkout and git worktree sees the same devices,
// leases, and test sessions.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

type Platform = "ios" | "android";
type DeviceKind = "simulator" | "emulator" | "physical";
type DeviceState = "booted" | "shutdown" | "connected" | "unavailable";

interface Device {
  id: string;
  platform: Platform;
  kind: DeviceKind;
  name: string;
  state: DeviceState;
}

// A device this CLI booted or created. `gc` shuts it down once idle.
interface Lease {
  deviceId: string;
  platform: Platform;
  kind: DeviceKind;
  name: string;
  worktree: string;
  bootedAt: string;
  isCreated: boolean;
}

type SessionStatus = "building" | "running" | "passed" | "failed" | "killed";

interface Session {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: Platform;
  kind: DeviceKind;
  flows: string[];
  worktree: string;
  branch: string;
  pid: number;
  childPid?: number;
  status: SessionStatus;
  startedAt: string;
  heartbeatAt: string;
  finishedAt?: string;
  exitCode?: number;
  logFile: string;
  reportDir: string;
}

interface CliErrorFields {
  status: string;
  message: string;
  why: string;
  fix: string;
}

class CliError extends Error {
  status: string;
  why: string;
  fix: string;

  constructor({ status, message, why, fix }: CliErrorFields) {
    super(message);
    this.name = "CliError";
    this.status = status;
    this.why = why;
    this.fix = fix;
  }
}

const STATE_DIR =
  process.env.PIXY_DEVICES_DIR ||
  path.join(os.homedir(), ".cache", "pixy", "devices");
const SESSIONS_DIR = path.join(STATE_DIR, "sessions");
const LEASES_DIR = path.join(STATE_DIR, "leases");
const LOGS_DIR = path.join(STATE_DIR, "logs");
const REPORTS_DIR = path.join(STATE_DIR, "reports");

const HEARTBEAT_MS = 15_000;
// A running session whose heartbeat is older than this lost its process.
const HEARTBEAT_STALE_MS = 2 * 60_000;
const DEFAULT_MAX_AGE = "60m";
const FINISHED_SESSION_TTL_MS = 7 * 24 * 60 * 60_000;
const DEFAULT_IOS_DEVICE_TYPE = "iPhone 17 Pro";
const DEFAULT_KEEP_BUILDS = 3;
const DEFAULT_KEEP_RECENT = "7d";

const run = (command: string, args: string[], timeout = 60_000) =>
  execFileSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
  }).trim();

const tryRun = (command: string, args: string[], timeout?: number) => {
  try {
    return run(command, args, timeout);
  } catch {
    return null;
  }
};

const readJson = <T>(file: string): T | null => {
  try {
    // SAFETY: only this CLI writes these files, always with the shape of T.
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
};

const writeJson = (file: string, data: Session | Lease) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
};

const readDir = <T>(dir: string): T[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => readJson<T>(path.join(dir, file)))
        .filter((item): item is T => item !== null)
    : [];

const parseDuration = (value: string) => {
  const match = /^(?<amount>\d+)(?<unit>[smhd])$/u.exec(value);
  if (!match) {
    throw new CliError({
      fix: "Use a number with s, m, h, or d, for example 45m or 2h.",
      message: `Invalid duration "${value}"`,
      status: "invalid_duration",
      why: "Durations need a unit.",
    });
  }
  const unitMs = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 };
  // SAFETY: the regex only matches the units s, m, h, and d.
  const unit = match.groups?.unit as keyof typeof unitMs;
  return Number(match.groups?.amount) * unitMs[unit];
};

const formatAge = (iso: string) => {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 90) {
    return `${seconds}s`;
  }
  if (seconds < 90 * 60) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${(seconds / 3600).toFixed(1)}h`;
};

const isProcessAlive = (pid: number | undefined) => {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const printTable = (columns: string[], rows: string[][]) => {
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => row[index].length))
  );
  const line = (cells: string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join("  ")
      .trimEnd();
  console.log(line(columns));
  for (const row of rows) {
    console.log(line(row));
  }
};

const getWorktree = () =>
  tryRun("git", ["rev-parse", "--show-toplevel"]) ?? process.cwd();

const getBranch = () =>
  tryRun("git", ["branch", "--show-current"]) ||
  tryRun("git", ["rev-parse", "--short", "HEAD"]) ||
  "unknown";

const parseCli = () =>
  parseArgs({
    allowPositionals: true,
    options: {
      all: { type: "boolean" },
      build: { type: "boolean" },
      "device-type": { default: DEFAULT_IOS_DEVICE_TYPE, type: "string" },
      "dry-run": { type: "boolean" },
      force: { type: "boolean" },
      help: { short: "h", type: "boolean" },
      json: { type: "boolean" },
      keep: { default: String(DEFAULT_KEEP_BUILDS), type: "string" },
      "keep-recent": { default: DEFAULT_KEEP_RECENT, type: "string" },
      "max-age": { default: DEFAULT_MAX_AGE, type: "string" },
      os: { type: "string" },
      platform: { type: "string" },
      record: { type: "boolean" },
      release: { type: "boolean" },
      stale: { type: "boolean" },
    },
  });

type CliValues = ReturnType<typeof parseCli>["values"];

const isPlatform = (value: string): value is Platform =>
  value === "ios" || value === "android";

const getPlatform = (values: CliValues) => {
  const value = values.platform ?? values.os;
  if (value === undefined || isPlatform(value)) {
    return value;
  }
  throw new CliError({
    fix: "Use --platform ios or --platform android.",
    message: `Unknown platform "${value}"`,
    status: "invalid_platform",
    why: "Only iOS and Android devices are supported.",
  });
};

const requireId = (usage: string, id: string | undefined) => {
  if (!id) {
    throw new CliError({
      fix: `Run \`bun devices list\` to find an ID, then: ${usage}.`,
      message: "Missing ID",
      status: "missing_id",
      why: `Usage: ${usage}.`,
    });
  }
  return id;
};

type Command = (args: string[], values: CliValues) => Promise<void> | void;

/** Types, constants, and helpers shared by every CLI noun. */
export {
  CliError,
  DEFAULT_IOS_DEVICE_TYPE,
  DEFAULT_KEEP_BUILDS,
  DEFAULT_KEEP_RECENT,
  DEFAULT_MAX_AGE,
  FINISHED_SESSION_TTL_MS,
  HEARTBEAT_MS,
  HEARTBEAT_STALE_MS,
  LEASES_DIR,
  LOGS_DIR,
  REPORTS_DIR,
  SESSIONS_DIR,
  STATE_DIR,
  formatAge,
  getBranch,
  getPlatform,
  getWorktree,
  isProcessAlive,
  parseCli,
  parseDuration,
  printTable,
  readDir,
  readJson,
  requireId,
  run,
  tryRun,
  writeJson,
};
export type {
  CliValues,
  Command,
  Device,
  DeviceKind,
  DeviceState,
  Lease,
  Platform,
  Session,
  SessionStatus,
};
