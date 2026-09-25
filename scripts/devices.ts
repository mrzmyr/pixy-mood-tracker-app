// Device and e2e session manager for local simulators, emulators, and phones.
// Usage: bun devices <command> [options]. Run `bun devices help` for details.
//
// State lives in ~/.cache/pixy/devices (override with PIXY_DEVICES_DIR), so every
// checkout and git worktree sees the same devices, leases, and test sessions.
import type { ChildProcess } from "node:child_process";
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
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

const HELP = `Manage local devices and e2e sessions for Pixy.

Usage: bun devices <command> [options]

Commands:
  list [--platform ios|android] [--all] [--json]
      Devices with kind, state, owner lease, and running e2e session.
      --all also shows shutdown simulators, stopped AVDs, and offline phones.
  create --platform ios [--device-type "${DEFAULT_IOS_DEVICE_TYPE}"]
      Create and boot a fresh simulator for this worktree. gc deletes it later.
  boot <id|avd:name>
      Boot a simulator or start an Android emulator (read-only, parallel-safe).
  shutdown <id>
      Shut down a simulator or emulator. Deletes simulators made by create.
  test <id> [flows...] [--build] [--record] [--force]
      Run Maestro flows on a device through maestro-runner (default: e2e/flows).
      --build installs a release build of this worktree first (simulator/emulator).
      --record keeps a video of every flow. --force takes over a busy device.
  sessions [--all] [--json]
      E2E sessions: device, flows, worktree, age, status. --all includes finished.
  kill <session-id|device-id> | kill --stale [--max-age ${DEFAULT_MAX_AGE}]
      Stop a session and its test process.
  gc [--max-age ${DEFAULT_MAX_AGE}] [--dry-run]
      Kill stale sessions and shut down idle devices booted by this CLI.

A running session is stale when its process died, its heartbeat stopped, or it
runs longer than --max-age. State: ${STATE_DIR}`;

// ---------------------------------------------------------------------------
// helpers

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

// ---------------------------------------------------------------------------
// Android SDK

const getAndroidSdk = () =>
  [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
    "/opt/homebrew/share/android-commandlinetools",
  ].find((dir) => dir && fs.existsSync(path.join(dir, "emulator", "emulator")));

const getEmulatorBinary = () => {
  const sdk = getAndroidSdk();
  if (!sdk) {
    throw new CliError({
      fix: "Install the Android emulator package and set ANDROID_HOME to the SDK path.",
      message: "Android emulator not found",
      status: "android_sdk_missing",
      why: "No emulator binary in ANDROID_HOME, ANDROID_SDK_ROOT, or default SDK paths.",
    });
  }
  return path.join(sdk, "emulator", "emulator");
};

// ---------------------------------------------------------------------------
// device discovery

interface SimctlDevice {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
}

const listIosSimulators = (): Device[] => {
  const output = tryRun("xcrun", [
    "simctl",
    "list",
    "devices",
    "available",
    "--json",
  ]);
  if (!output) {
    return [];
  }
  // SAFETY: shape documented by `xcrun simctl list --json`.
  const { devices } = JSON.parse(output) as {
    devices: Record<string, SimctlDevice[]>;
  };
  return Object.entries(devices)
    .filter(([runtime]) => runtime.includes("SimRuntime.iOS"))
    .flatMap(([runtime, list]) =>
      list.map((device) => ({
        id: device.udid,
        kind: "simulator" as const,
        name: `${device.name} (iOS ${runtime.split("iOS-")[1]?.replaceAll("-", ".")})`,
        platform: "ios" as const,
        state:
          device.state === "Booted"
            ? ("booted" as const)
            : ("shutdown" as const),
      }))
    );
};

interface DevicectlDevice {
  connectionProperties: { tunnelState?: string; pairingState?: string };
  deviceProperties: { name: string };
  hardwareProperties: { udid?: string; platform?: string; reality?: string };
}

const listIosPhones = (): Device[] => {
  const file = path.join(os.tmpdir(), `pixy-devicectl-${process.pid}.json`);
  if (
    tryRun(
      "xcrun",
      ["devicectl", "list", "devices", "--quiet", "--json-output", file],
      20_000
    ) === null
  ) {
    return [];
  }
  const result = readJson<{ result: { devices: DevicectlDevice[] } }>(file);
  fs.rmSync(file, { force: true });
  return (result?.result.devices ?? [])
    .filter(
      (device) =>
        device.hardwareProperties.platform === "iOS" &&
        device.hardwareProperties.reality === "physical" &&
        device.hardwareProperties.udid
    )
    .map((device) => ({
      id: device.hardwareProperties.udid ?? "",
      kind: "physical" as const,
      name: device.deviceProperties.name,
      platform: "ios" as const,
      state:
        device.connectionProperties.tunnelState === "connected" ||
        device.connectionProperties.tunnelState === "disconnected"
          ? ("connected" as const)
          : ("unavailable" as const),
    }));
};

const getAvdName = (serial: string) =>
  tryRun("adb", ["-s", serial, "emu", "avd", "name"])?.split("\n")[0].trim() ??
  serial;

const listAndroidDevices = (): Device[] => {
  const output = tryRun("adb", ["devices", "-l"]);
  if (!output) {
    return [];
  }
  return output
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/u))
    .filter(([serial]) => serial)
    .map(([serial, adbState, ...props]): Device => {
      const isEmulator = serial.startsWith("emulator-");
      const model = props.find((prop) => prop.startsWith("model:"))?.slice(6);
      let state: DeviceState = "unavailable";
      if (adbState === "device") {
        state = isEmulator ? "booted" : "connected";
      }
      return {
        id: serial,
        kind: isEmulator ? "emulator" : "physical",
        name: isEmulator ? getAvdName(serial) : (model ?? serial),
        platform: "android",
        state,
      };
    });
};

const listStoppedAvds = (running: Device[]): Device[] => {
  const sdk = getAndroidSdk();
  if (!sdk) {
    return [];
  }
  const runningNames = new Set(running.map((device) => device.name));
  return (tryRun(path.join(sdk, "emulator", "emulator"), ["-list-avds"]) ?? "")
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name && !runningNames.has(name))
    .map((name) => ({
      id: `avd:${name}`,
      kind: "emulator" as const,
      name,
      platform: "android" as const,
      state: "shutdown" as const,
    }));
};

const listDevices = (platform?: Platform): Device[] => {
  const devices: Device[] = [];
  if (!platform || platform === "ios") {
    devices.push(...listIosSimulators(), ...listIosPhones());
  }
  if (!platform || platform === "android") {
    const android = listAndroidDevices();
    devices.push(...android, ...listStoppedAvds(android));
  }
  return devices;
};

const findDevice = (id: string) => {
  const device = listDevices().find(
    (candidate) => candidate.id === id || candidate.id === `avd:${id}`
  );
  if (!device) {
    throw new CliError({
      fix: "Run `bun devices list --all` and pass an ID from the first column.",
      message: `Device ${id} not found`,
      status: "device_not_found",
      why: "No simulator, emulator, AVD, or connected phone has this ID.",
    });
  }
  return device;
};

// ---------------------------------------------------------------------------
// leases and sessions

const leaseFile = (deviceId: string) =>
  path.join(LEASES_DIR, `${deviceId.replaceAll(/[^\w.-]/gu, "_")}.json`);

const readLeases = () => readDir<Lease>(LEASES_DIR);

const writeLease = (device: Device, isCreated: boolean) =>
  writeJson(leaseFile(device.id), {
    bootedAt: new Date().toISOString(),
    deviceId: device.id,
    isCreated,
    kind: device.kind,
    name: device.name,
    platform: device.platform,
    worktree: getWorktree(),
  } satisfies Lease);

const sessionFile = (id: string) => path.join(SESSIONS_DIR, `${id}.json`);

const readSessions = () =>
  readDir<Session>(SESSIONS_DIR).toSorted((a, b) =>
    a.startedAt.localeCompare(b.startedAt)
  );

const isActive = (session: Session) =>
  session.status === "building" || session.status === "running";

// Explains why an active session is stale, or returns null when healthy.
const getStaleReason = (session: Session, maxAgeMs: number) => {
  if (!isActive(session)) {
    return null;
  }
  if (!isProcessAlive(session.pid)) {
    return "process exited";
  }
  if (Date.now() - Date.parse(session.heartbeatAt) > HEARTBEAT_STALE_MS) {
    return "heartbeat stopped";
  }
  if (Date.now() - Date.parse(session.startedAt) > maxAgeMs) {
    return `older than ${formatAge(new Date(Date.now() - maxAgeMs).toISOString())}`;
  }
  return null;
};

// A test's process group can outlive its leader: when the leader dies,
// children such as xcodebuild keep running with the same group ID.
const isGroupAlive = (pid: number) => isProcessAlive(pid) || isProcessAlive(-pid);

const killProcessTree = async (pid: number | undefined) => {
  if (!pid || !isGroupAlive(pid)) {
    return;
  }
  const signal = (name: NodeJS.Signals) => {
    // Test processes run in their own group; the negative PID reaches all.
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, name);
      } catch {
        // Already gone.
      }
    }
  };
  signal("SIGTERM");
  await sleep(3000);
  if (isGroupAlive(pid)) {
    signal("SIGKILL");
  }
};

const killSession = async (session: Session, reason: string) => {
  await killProcessTree(session.childPid);
  await killProcessTree(session.pid);
  writeJson(sessionFile(session.id), {
    ...session,
    finishedAt: new Date().toISOString(),
    status: "killed",
  } satisfies Session);
  console.log(`Killed ${session.id} on ${session.deviceName} (${reason})`);
};

// ---------------------------------------------------------------------------
// boot and shutdown

const waitFor = async (
  label: string,
  check: () => boolean,
  timeoutMs: number
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) {
      return;
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(2000);
  }
  throw new CliError({
    fix: "Retry once. If it keeps failing, run `bun devices gc` and restart the device.",
    message: `Timed out waiting for ${label}`,
    status: "boot_timeout",
    why: `The device did not become ready within ${timeoutMs / 1000}s.`,
  });
};

const getFreeEmulatorPort = () => {
  const used = new Set(
    listAndroidDevices()
      .filter((device) => device.kind === "emulator")
      .map((device) => Number(device.id.replace("emulator-", "")))
  );
  for (let port = 5554; port <= 5682; port += 2) {
    if (!used.has(port)) {
      return port;
    }
  }
  throw new CliError({
    fix: "Run `bun devices gc` or shut down emulators you no longer need.",
    message: "No free emulator port",
    status: "emulator_ports_exhausted",
    why: "All adb emulator ports between 5554 and 5682 are in use.",
  });
};

const bootDevice = async (device: Device) => {
  if (device.kind === "physical") {
    throw new CliError({
      fix: "Unlock the phone and connect it with a cable or on the same network.",
      message: `Cannot boot physical device ${device.name}`,
      status: "physical_device_boot",
      why: "Only simulators and emulators can be started from the command line.",
    });
  }
  if (device.state === "booted") {
    console.log(`${device.name} already booted (${device.id})`);
    return device;
  }
  if (device.platform === "ios") {
    run("xcrun", ["simctl", "boot", device.id]);
    run("xcrun", ["simctl", "bootstatus", device.id, "-b"], 300_000);
    const booted = { ...device, state: "booted" as const };
    writeLease(
      booted,
      readJson<Lease>(leaseFile(device.id))?.isCreated ?? false
    );
    console.log(`Booted ${device.name} (${device.id})`);
    return booted;
  }
  const port = getFreeEmulatorPort();
  const serial = `emulator-${port}`;
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const log = fs.openSync(path.join(LOGS_DIR, `${serial}.log`), "a");
  // Read-only mode lets several emulators share one AVD in parallel.
  spawn(
    getEmulatorBinary(),
    [
      "-avd",
      device.name,
      "-port",
      String(port),
      "-read-only",
      "-no-snapshot-save",
      "-no-boot-anim",
    ],
    { detached: true, stdio: ["ignore", log, log] }
  ).unref();
  await waitFor(
    `${serial} to boot`,
    () =>
      tryRun(
        "adb",
        ["-s", serial, "shell", "getprop", "sys.boot_completed"],
        5000
      ) === "1",
    300_000
  );
  const booted: Device = { ...device, id: serial, state: "booted" };
  writeLease(booted, false);
  console.log(`Booted ${device.name} (${serial})`);
  return booted;
};

const shutdownDevice = (device: Device) => {
  const lease = readJson<Lease>(leaseFile(device.id));
  if (device.kind === "physical") {
    throw new CliError({
      fix: "Disconnect the phone instead.",
      message: `Cannot shut down physical device ${device.name}`,
      status: "physical_device_shutdown",
      why: "Only simulators and emulators are managed by this CLI.",
    });
  }
  if (device.platform === "ios") {
    tryRun("xcrun", ["simctl", "shutdown", device.id]);
    if (lease?.isCreated) {
      tryRun("xcrun", ["simctl", "delete", device.id]);
    }
  } else if (device.state === "booted") {
    tryRun("adb", ["-s", device.id, "emu", "kill"]);
  }
  fs.rmSync(leaseFile(device.id), { force: true });
  console.log(
    `${lease?.isCreated ? "Deleted" : "Shut down"} ${device.name} (${device.id})`
  );
};

// ---------------------------------------------------------------------------
// commands

const cmdList = (
  platform: Platform | undefined,
  isAll: boolean,
  isJson: boolean
) => {
  const leases = new Map(readLeases().map((lease) => [lease.deviceId, lease]));
  const sessions = readSessions().filter(isActive);
  const devices = listDevices(platform).filter(
    (device) =>
      isAll || device.state === "booted" || device.state === "connected"
  );
  const rows = devices.map((device) => ({
    ...device,
    lease: leases.get(device.id) ?? null,
    session: sessions.find((session) => session.deviceId === device.id) ?? null,
  }));
  if (isJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log(`No ${isAll ? "" : "running "}devices. Try --all.`);
    return;
  }
  const maxAgeMs = parseDuration(DEFAULT_MAX_AGE);
  const describeSession = (session: Session) => {
    const stale = getStaleReason(session, maxAgeMs) ? " STALE" : "";
    return `${session.id} ${session.status}${stale} ${formatAge(session.startedAt)} ${path.basename(session.worktree)}`;
  };
  printTable(
    ["ID", "OS", "KIND", "STATE", "NAME", "OWNER", "SESSION"],
    rows.map(({ id, kind, lease, name, platform: os_, session, state }) => [
      id,
      os_,
      kind,
      state,
      name,
      lease
        ? `${path.basename(lease.worktree)} ${formatAge(lease.bootedAt)}`
        : "-",
      session ? describeSession(session) : "-",
    ])
  );
};

const cmdCreate = async (
  platform: Platform | undefined,
  deviceType: string
) => {
  if (platform !== "ios") {
    throw new CliError({
      fix: "Use `bun devices boot avd:<name>` for Android. Read-only emulators run in parallel.",
      message: "create supports --platform ios only",
      status: "create_unsupported_platform",
      why: "Android emulators are started from existing AVDs.",
    });
  }
  const name = `pixy-${path.basename(getWorktree())}-${crypto.randomBytes(2).toString("hex")}`;
  const udid =
    run("xcrun", ["simctl", "create", name, deviceType]).split("\n").at(-1) ??
    "";
  const device: Device = {
    id: udid,
    kind: "simulator",
    name,
    platform: "ios",
    state: "shutdown",
  };
  writeLease(device, true);
  await bootDevice(device);
  console.log(udid);
};

// Resolves with the exit code; 127 when the binary could not start.
const waitForExit = async (child: ChildProcess) => {
  try {
    // SAFETY: a ChildProcess "exit" event passes (code: number | null, signal).
    const [code] = (await once(child, "exit")) as [number | null];
    return code ?? 1;
  } catch {
    return 127;
  }
};

const startBuild = (device: Device, log: number) => {
  const args =
    device.platform === "ios"
      ? [
          "expo",
          "run:ios",
          "--device",
          device.id,
          "--configuration",
          "Release",
          "--no-bundler",
        ]
      : [
          "expo",
          "run:android",
          "--device",
          device.name,
          "--variant",
          "release",
          "--no-bundler",
        ];
  console.log(`Building: bunx ${args.join(" ")}`);
  return spawn("bunx", args, {
    cwd: getWorktree(),
    detached: true,
    env: { ...process.env, CI: "1" },
    stdio: ["ignore", log, log],
  });
};

const listFlowFiles = (target: string): string[] =>
  fs.statSync(target).isDirectory()
    ? fs
        .readdirSync(target)
        .flatMap((entry) => listFlowFiles(path.join(target, entry)))
    : [target].filter((file) => /\.ya?ml$/u.test(file));

// Phones run installed TestFlight builds with real tester data.
const assertNoClearState = (flows: string[]) => {
  const unsafe = flows
    .flatMap(listFlowFiles)
    .filter((file) => fs.readFileSync(file, "utf-8").includes("clearState"));
  if (unsafe.length > 0) {
    throw new CliError({
      fix: "Run these flows on a simulator or emulator, or pass flows without clearState.",
      message: "Flows with clearState cannot run on a physical device",
      status: "physical_clear_state",
      why: `clearState can remove tester data. Found in: ${unsafe.join(", ")}.`,
    });
  }
};

const cmdTest = async (
  id: string,
  flows: string[],
  options: { isBuild: boolean; isRecord: boolean; isForce: boolean }
) => {
  const device = findDevice(id);
  if (device.state !== "booted" && device.state !== "connected") {
    throw new CliError({
      fix: `Run \`bun devices boot ${device.id}\` first.`,
      message: `${device.name} is not running`,
      status: "device_not_running",
      why: `Device state is ${device.state}.`,
    });
  }
  const busy = readSessions().find(
    (session) => isActive(session) && session.deviceId === device.id
  );
  if (busy) {
    const staleReason = getStaleReason(busy, parseDuration(DEFAULT_MAX_AGE));
    if (!staleReason && !options.isForce) {
      throw new CliError({
        fix: "Pick another device, `bun devices create --platform ios`, or pass --force to take over.",
        message: `${device.name} is busy with session ${busy.id}`,
        status: "device_busy",
        why: `${path.basename(busy.worktree)} started it ${formatAge(busy.startedAt)} ago.`,
      });
    }
    await killSession(busy, staleReason ?? "taken over with --force");
  }
  const selectedFlows = flows.length > 0 ? flows : ["e2e/flows"];
  if (device.kind === "physical") {
    assertNoClearState(selectedFlows);
  }
  if (options.isBuild && device.kind === "physical") {
    throw new CliError({
      fix: "Install a TestFlight build on the phone, then run without --build.",
      message: "--build is not supported on physical devices",
      status: "build_physical_device",
      why: "Physical devices are tested with installed TestFlight builds.",
    });
  }

  const sessionId = `${new Date().toISOString().slice(5, 10).replace("-", "")}-${crypto.randomBytes(3).toString("hex")}`;
  const worktree = getWorktree();
  const now = new Date().toISOString();
  const session: Session = {
    branch: getBranch(),
    deviceId: device.id,
    deviceName: device.name,
    flows: selectedFlows,
    heartbeatAt: now,
    id: sessionId,
    kind: device.kind,
    logFile: path.join(LOGS_DIR, `${sessionId}.log`),
    pid: process.pid,
    platform: device.platform,
    reportDir: path.join(REPORTS_DIR, sessionId),
    startedAt: now,
    status: options.isBuild ? "building" : "running",
    worktree,
  };
  const save = () => writeJson(sessionFile(sessionId), session);
  save();
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const log = fs.openSync(session.logFile, "a");
  console.log(`Session ${sessionId} on ${device.name} (${device.id})`);
  console.log(`Log: ${session.logFile}`);

  const heartbeat = setInterval(() => {
    session.heartbeatAt = new Date().toISOString();
    save();
  }, HEARTBEAT_MS);
  const finish = (status: SessionStatus, exitCode: number) => {
    clearInterval(heartbeat);
    Object.assign(session, {
      exitCode,
      finishedAt: new Date().toISOString(),
      status,
    });
    save();
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => {
      if (session.childPid) {
        try {
          process.kill(-session.childPid, "SIGTERM");
        } catch {
          // Already gone.
        }
      }
      finish("killed", 130);
      process.exit(130);
    });
  }

  if (options.isBuild) {
    const build = startBuild(device, log);
    session.childPid = build.pid;
    save();
    const buildCode = await waitForExit(build);
    if (buildCode !== 0) {
      finish("failed", buildCode);
      throw new CliError({
        fix: `Read ${session.logFile}, fix the build, and rerun.`,
        message: "App build failed",
        status: "build_failed",
        why: `expo run exited with code ${buildCode}.`,
      });
    }
    session.status = "running";
    save();
  }

  const runner = path.join(
    os.homedir(),
    ".maestro-runner",
    "bin",
    "maestro-runner"
  );
  const args = [
    "--platform",
    device.platform,
    "--device",
    device.id,
    "--no-ansi",
    // Never reinstall or wipe a phone's TestFlight build.
    ...(device.kind === "physical" ? ["--no-app-install"] : []),
    "test",
    "--output",
    session.reportDir,
    "--flatten",
    ...(options.isRecord ? ["--record"] : []),
    ...selectedFlows,
  ];
  console.log(`Running: maestro-runner ${args.join(" ")}`);
  const child = spawn(fs.existsSync(runner) ? runner : "maestro-runner", args, {
    cwd: worktree,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  session.childPid = child.pid;
  save();
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      fs.writeSync(log, chunk);
    });
  }
  const exitCode = await waitForExit(child);
  finish(exitCode === 0 ? "passed" : "failed", exitCode);
  console.log(
    `\nSession ${sessionId} ${session.status}. Report: ${session.reportDir}`
  );
  process.exitCode = exitCode;
};

const cmdSessions = (isAll: boolean, isJson: boolean) => {
  const maxAgeMs = parseDuration(DEFAULT_MAX_AGE);
  const sessions = readSessions()
    .filter((session) => isAll || isActive(session))
    .map((session) => ({
      ...session,
      staleReason: getStaleReason(session, maxAgeMs),
    }));
  if (isJson) {
    console.log(JSON.stringify(sessions, null, 2));
    return;
  }
  if (sessions.length === 0) {
    console.log(`No ${isAll ? "" : "running "}sessions.`);
    return;
  }
  printTable(
    ["ID", "STATUS", "DEVICE", "AGE", "WORKTREE", "FLOWS"],
    sessions.map((session) => [
      session.id,
      session.staleReason ? `stale (${session.staleReason})` : session.status,
      `${session.deviceName} ${session.deviceId}`,
      formatAge(session.startedAt),
      `${path.basename(session.worktree)} (${session.branch})`,
      session.flows.join(" "),
    ])
  );
};

// Kills every active session that is stale for `maxAgeMs`.
const killStaleSessions = async (maxAgeMs: number, isDryRun: boolean) => {
  const stale = readSessions().flatMap((session) => {
    const reason = getStaleReason(session, maxAgeMs);
    return reason ? [{ reason, session }] : [];
  });
  if (isDryRun) {
    for (const { reason, session } of stale) {
      console.log(`Would kill ${session.id} (${reason})`);
    }
    return stale.length;
  }
  await Promise.all(
    stale.map(({ reason, session }) => killSession(session, reason))
  );
  return stale.length;
};

const cmdKill = async (
  target: string | undefined,
  isStale: boolean,
  maxAge: string
) => {
  if (isStale) {
    const count = await killStaleSessions(parseDuration(maxAge), false);
    console.log(`${count} stale session(s) killed.`);
    return;
  }
  const session = readSessions().find(
    (candidate) =>
      isActive(candidate) &&
      (candidate.id === target || candidate.deviceId === target)
  );
  if (!session) {
    throw new CliError({
      fix: "Run `bun devices sessions` and pass a session or device ID.",
      message: `No running session for ${target}`,
      status: "session_not_found",
      why: "No building or running session matches this ID.",
    });
  }
  await killSession(session, "killed by user");
};

const removeOldSessions = (isDryRun: boolean) => {
  const old = readSessions().filter(
    (session) =>
      !isActive(session) &&
      Date.now() - Date.parse(session.finishedAt ?? session.startedAt) >
        FINISHED_SESSION_TTL_MS
  );
  for (const session of old) {
    if (isDryRun) {
      console.log(`Would remove finished session ${session.id}`);
    } else {
      fs.rmSync(sessionFile(session.id), { force: true });
      fs.rmSync(session.logFile, { force: true });
      fs.rmSync(session.reportDir, { force: true, recursive: true });
    }
  }
};

// Explains why a leased device should be released, or returns null. A device
// is idle once `maxAgeMs` passed since it booted or last ran a session.
const getReleaseReason = (
  lease: Lease,
  device: Device | undefined,
  maxAgeMs: number
) => {
  if (!device || device.state === "shutdown") {
    return "not running";
  }
  if (!fs.existsSync(lease.worktree)) {
    return "worktree removed";
  }
  const lastUsed = Math.max(
    Date.parse(lease.bootedAt),
    ...readSessions()
      .filter((session) => session.deviceId === lease.deviceId)
      .map((session) => Date.parse(session.finishedAt ?? session.heartbeatAt))
  );
  if (Date.now() - lastUsed > maxAgeMs) {
    return `idle longer than ${formatAge(new Date(Date.now() - maxAgeMs).toISOString())}`;
  }
  return null;
};

const releaseIdleDevices = (
  devices: Device[],
  busyDevices: Set<string>,
  maxAgeMs: number,
  isDryRun: boolean
) => {
  for (const lease of readLeases()) {
    const device = devices.find((candidate) => candidate.id === lease.deviceId);
    const reason = getReleaseReason(lease, device, maxAgeMs);
    if (!reason || busyDevices.has(lease.deviceId)) {
      continue;
    }
    if (isDryRun) {
      console.log(`Would release ${lease.name} (${lease.deviceId}): ${reason}`);
    } else if (device) {
      shutdownDevice(device);
    } else {
      fs.rmSync(leaseFile(lease.deviceId), { force: true });
    }
  }
};

const cmdGc = async (maxAge: string, isDryRun: boolean) => {
  const maxAgeMs = parseDuration(maxAge);
  await killStaleSessions(maxAgeMs, isDryRun);
  removeOldSessions(isDryRun);

  const devices = listDevices();
  const busyDevices = new Set(
    readSessions()
      .filter(
        (session) => isActive(session) && !getStaleReason(session, maxAgeMs)
      )
      .map((session) => session.deviceId)
  );
  releaseIdleDevices(devices, busyDevices, maxAgeMs, isDryRun);

  const leased = new Set(readLeases().map((lease) => lease.deviceId));
  const unowned = devices.filter(
    (device) =>
      device.state === "booted" &&
      !leased.has(device.id) &&
      !busyDevices.has(device.id)
  );
  if (unowned.length > 0) {
    console.log(
      `\n${unowned.length} booted device(s) not started by this CLI were left alone:`
    );
    for (const device of unowned) {
      console.log(
        `  ${device.id}  ${device.name}  (bun devices shutdown ${device.id})`
      );
    }
  }
};

// ---------------------------------------------------------------------------
// entry point

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
      "max-age": { default: DEFAULT_MAX_AGE, type: "string" },
      os: { type: "string" },
      platform: { type: "string" },
      record: { type: "boolean" },
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

const requireId = (command: string, id: string | undefined) => {
  if (!id) {
    throw new CliError({
      fix: `Run \`bun devices list\` and pass an ID: bun devices ${command} <id>.`,
      message: `${command} needs a device ID`,
      status: "missing_device_id",
      why: "No device ID was given.",
    });
  }
  return id;
};

type Command = (args: string[], values: CliValues) => Promise<void> | void;

const COMMANDS = new Map(
  Object.entries({
    boot: async ([id]) => {
      await bootDevice(findDevice(requireId("boot", id)));
    },
    create: (_args, values) =>
      cmdCreate(getPlatform(values), values["device-type"]),
    gc: (_args, values) => cmdGc(values["max-age"], values["dry-run"] ?? false),
    help: () => console.log(HELP),
    kill: ([target], values) =>
      cmdKill(target, values.stale ?? false, values["max-age"]),
    list: (_args, values) =>
      cmdList(getPlatform(values), values.all ?? false, values.json ?? false),
    sessions: (_args, values) =>
      cmdSessions(values.all ?? false, values.json ?? false),
    shutdown: ([id]) => shutdownDevice(findDevice(requireId("shutdown", id))),
    test: ([id, ...flows], values) =>
      cmdTest(requireId("test", id), flows, {
        isBuild: values.build ?? false,
        isForce: values.force ?? false,
        isRecord: values.record ?? false,
      }),
  } satisfies Record<string, Command>)
);
const ALIASES = new Map([
  ["ls", "list"],
  ["ps", "sessions"],
]);

const main = async () => {
  const { positionals, values } = parseCli();
  const [name = "list", ...args] = positionals;
  const command = COMMANDS.get(
    values.help ? "help" : (ALIASES.get(name) ?? name)
  );
  if (!command) {
    throw new CliError({
      fix: "Run `bun devices help` to see all commands.",
      message: `Unknown command "${name}"`,
      status: "unknown_command",
      why: "The first argument must be a devices command.",
    });
  }
  await command(args, values);
};

try {
  await main();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          fix: "Rerun the command. If it fails again, check the device with `bun devices list --all`.",
          message: error instanceof Error ? error.message : String(error),
          status: "unexpected_error",
          why: "An underlying tool (xcrun, adb, emulator, maestro-runner) failed.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
