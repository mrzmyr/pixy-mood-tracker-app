// `bun devices`: list, create, boot, shut down, and clean up simulators,
// emulators, and phones.
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  getStaleReason,
  isActive,
  killStaleSessions,
  readSessions,
} from "./session-store.ts";
import {
  APP_ID,
  CliError,
  DEFAULT_IOS_DEVICE_TYPE,
  DEFAULT_MAX_AGE,
  INSTALLS_DIR,
  LEASES_DIR,
  LOGS_DIR,
  formatAge,
  getPlatform,
  getWorktree,
  parseDuration,
  printTable,
  readDir,
  readJson,
  requireId,
  run,
  tryRun,
  writeJson,
} from "./shared.ts";
import type {
  Command,
  Device,
  DeviceState,
  Install,
  Lease,
  Platform,
  Session,
} from "./shared.ts";

const getAndroidSdk = () =>
  [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
    "/opt/homebrew/share/android-commandlinetools",
  ].find((dir) => dir && fs.existsSync(path.join(dir, "emulator", "emulator")));

const requireAndroidSdk = () => {
  const sdk = getAndroidSdk();
  if (!sdk) {
    throw new CliError({
      fix: "Install the Android emulator package and set ANDROID_HOME to the SDK path.",
      message: "Android emulator not found",
      status: "android_sdk_missing",
      why: "No emulator binary in ANDROID_HOME, ANDROID_SDK_ROOT, or default SDK paths.",
    });
  }
  return sdk;
};

const getEmulatorBinary = () =>
  path.join(requireAndroidSdk(), "emulator", "emulator");

// Gradle needs JDK 17+. Homebrew's openjdk@17 is not registered with
// java_home unless it was symlinked into /Library/Java.
const getJavaHome = () =>
  [
    process.env.JAVA_HOME,
    tryRun("/usr/libexec/java_home", ["-v", "17+"]),
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
  ].find((dir) => dir && fs.existsSync(path.join(dir, "bin", "java")));

/** Env for Android builds: the SDK and JDK the CLI found, even when unset. */
const getAndroidBuildEnv = () => {
  const javaHome = getJavaHome();
  if (!javaHome) {
    throw new CliError({
      fix: "Install JDK 17 (`brew install openjdk@17`) or set JAVA_HOME to a JDK 17+ home.",
      message: "Java runtime not found",
      status: "java_missing",
      why: "Gradle needs JDK 17+. None found in JAVA_HOME, java_home, or Homebrew.",
    });
  }
  const sdk = requireAndroidSdk();
  return {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    JAVA_HOME: javaHome,
    PATH: [path.join(javaHome, "bin"), process.env.PATH].join(path.delimiter),
  };
};

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
  deviceProperties: { name: string; developerModeStatus?: string };
  hardwareProperties: { udid?: string; platform?: string; reality?: string };
}

const ANDROID_TRUST_FIX =
  "Unlock the phone and accept Allow USB debugging (check Always allow). Then rerun `bun devices list`.";

// The first missing setup step on an iPhone, or null when it is ready.
const getIosSetupFix = (
  { connectionProperties, deviceProperties }: DevicectlDevice,
  udid: string
) => {
  if (connectionProperties.pairingState !== "paired") {
    return `Unlock the iPhone and tap Trust, then pair it for developer tools: \`xcrun devicectl manage pair --device ${udid}\`.`;
  }
  if (deviceProperties.developerModeStatus === "disabled") {
    return "Turn on Settings > Privacy & Security > Developer Mode on the iPhone, restart it, and confirm Turn On after unlocking.";
  }
  return null;
};

const getIosPhoneState = (
  { connectionProperties: { tunnelState } }: DevicectlDevice,
  setupFix: string | null
): DeviceState => {
  if (setupFix) {
    return "unauthorized";
  }
  return tunnelState === "connected" || tunnelState === "disconnected"
    ? "connected"
    : "unavailable";
};

/** What to do on an attached phone that is not ready for tests yet. */
const getTrustFix = (device: Device) => device.setupFix ?? ANDROID_TRUST_FIX;

// Runs a devicectl command and returns its JSON `result`, or null.
const readDevicectl = <T>(args: string[]): T | null => {
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-devicectl-${process.pid}.json`
  );
  const output = tryRun(
    "xcrun",
    ["devicectl", ...args, "--quiet", "--json-output", file],
    20_000
  );
  const json = output === null ? null : readJson<{ result: T }>(file);
  fs.rmSync(file, { force: true });
  return json?.result ?? null;
};

// `list devices` keeps a stale Developer Mode status until a tunnel opens.
// Asking for details opens one and reads the live value.
const refreshIfStale = (device: DevicectlDevice, udid: string) =>
  device.deviceProperties.developerModeStatus === "disabled" &&
  device.connectionProperties.pairingState === "paired" &&
  device.connectionProperties.tunnelState !== "connected"
    ? (readDevicectl<DevicectlDevice>([
        "device",
        "info",
        "details",
        "--device",
        udid,
      ]) ?? device)
    : device;

const listIosPhones = (): Device[] =>
  (
    readDevicectl<{ devices: DevicectlDevice[] }>(["list", "devices"])
      ?.devices ?? []
  )
    .filter(
      (device) =>
        device.hardwareProperties.platform === "iOS" &&
        // Unpaired phones omit `reality`; devicectl never lists simulators.
        device.hardwareProperties.reality !== "virtual" &&
        device.hardwareProperties.udid
    )
    .map((listed): Device => {
      const udid = listed.hardwareProperties.udid ?? "";
      const device = refreshIfStale(listed, udid);
      const setupFix = getIosSetupFix(device, udid);
      return {
        id: udid,
        kind: "physical",
        name: device.deviceProperties.name,
        platform: "ios",
        setupFix,
        state: getIosPhoneState(device, setupFix),
      };
    });

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
      } else if (adbState === "unauthorized") {
        state = "unauthorized";
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

const leaseFile = (deviceId: string) =>
  path.join(LEASES_DIR, `${deviceId.replaceAll(/[^\w.-]/gu, "_")}.json`);

const readLeases = () => readDir<Lease>(LEASES_DIR);

const installFile = (deviceId: string) =>
  path.join(INSTALLS_DIR, `${deviceId.replaceAll(/[^\w.-]/gu, "_")}.json`);

const readInstall = (deviceId: string) =>
  readJson<Install>(installFile(deviceId));

const recordInstall = (deviceId: string, key: string, sessionId: string) =>
  writeJson(installFile(deviceId), {
    deviceId,
    installedAt: new Date().toISOString(),
    key,
    sessionId,
  } satisfies Install);

const formatVersion = (version?: string, build?: string) =>
  version && build && build !== version
    ? `${version} (${build})`
    : (version ?? build ?? null);

// Version of the app installed on a device, or null when it is missing.
const readInstalledApp = (device: Device): string | null => {
  if (device.platform === "android") {
    const output = tryRun("adb", [
      "-s",
      device.id,
      "shell",
      "dumpsys",
      "package",
      APP_ID,
    ]);
    const name = /versionName=(?<value>\S+)/u.exec(output ?? "")?.groups?.value;
    const code = /versionCode=(?<value>\d+)/u.exec(output ?? "")?.groups?.value;
    return formatVersion(name, code);
  }
  if (device.kind === "simulator") {
    const output = tryRun("xcrun", ["simctl", "appinfo", device.id, APP_ID]);
    // simctl prints only the identifier when the app is not installed.
    if (!output?.includes("Bundle =")) {
      return null;
    }
    const field = (name: string) =>
      new RegExp(`${name} = "?(?<value>[^";]+)"?;`, "u").exec(output)?.groups
        ?.value;
    return formatVersion(
      field("CFBundleShortVersionString"),
      field("CFBundleVersion")
    );
  }
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-apps-${process.pid}.json`
  );
  tryRun(
    "xcrun",
    [
      "devicectl",
      "device",
      "info",
      "apps",
      "--device",
      device.id,
      "--include-all-apps",
      "--bundle-id",
      APP_ID,
      "--quiet",
      "--json-output",
      file,
    ],
    30_000
  );
  const result = readJson<{
    result?: {
      apps?: {
        bundleIdentifier?: string;
        version?: string;
        bundleVersion?: string;
      }[];
    };
  }>(file);
  fs.rmSync(file, { force: true });
  const app = result?.result?.apps?.find(
    (candidate) => candidate.bundleIdentifier === APP_ID
  );
  return app ? formatVersion(app.version, app.bundleVersion) : null;
};

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

const cmdList = (
  platform: Platform | undefined,
  isAll: boolean,
  isJson: boolean
) => {
  const leases = new Map(readLeases().map((lease) => [lease.deviceId, lease]));
  const sessions = readSessions().filter(isActive);
  const devices = listDevices(platform).filter(
    (device) =>
      isAll ||
      device.state === "booted" ||
      device.state === "connected" ||
      device.state === "unauthorized"
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
  for (const device of devices.filter(
    ({ state }) => state === "unauthorized"
  )) {
    console.log(`\n${device.name} (${device.id}) is unauthorized.`);
    console.log(`  fix: ${getTrustFix(device)}`);
  }
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
  const name = `pixy-mood-tracker-${path.basename(getWorktree())}-${crypto.randomBytes(2).toString("hex")}`;
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
  // Stale sessions would keep their devices busy forever.
  await killStaleSessions(maxAgeMs, isDryRun);

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

const DEVICES_HELP = `Manage simulators, emulators, and phones.

Usage: bun devices <command> [options]

  list [--platform ios|android] [--all] [--json]
      Devices with kind, state, owner (the worktree that booted it), and the
      running e2e session. --all also shows shutdown simulators, stopped AVDs,
      and offline phones.
  create --platform ios [--device-type "${DEFAULT_IOS_DEVICE_TYPE}"]
      Create and boot a simulator for this worktree. gc deletes it once idle.
  boot <id|avd:name>
      Boot a simulator or start an Android emulator (read-only, parallel-safe).
  shutdown <id>
      Shut down a simulator or emulator. Deletes simulators made by create.
  gc [--max-age ${DEFAULT_MAX_AGE}] [--dry-run]
      Stop stale sessions, then shut down devices this CLI started that are
      idle for --max-age or whose worktree is gone. Other devices are listed,
      never touched.`;

const DEVICES_COMMANDS = new Map(
  Object.entries({
    boot: async ([id]) => {
      await bootDevice(findDevice(requireId("bun devices boot <id>", id)));
    },
    create: (_args, values) =>
      cmdCreate(getPlatform(values), values["device-type"]),
    gc: (_args, values) => cmdGc(values["max-age"], values["dry-run"] ?? false),
    help: () => console.log(DEVICES_HELP),
    list: (_args, values) =>
      cmdList(getPlatform(values), values.all ?? false, values.json ?? false),
    shutdown: ([id]) =>
      shutdownDevice(findDevice(requireId("bun devices shutdown <id>", id))),
  } satisfies Record<string, Command>)
);

/** `bun devices` commands, device lookup and Android env for sessions, and
 * device state for the dashboard. */
export {
  DEVICES_COMMANDS,
  findDevice,
  getAndroidBuildEnv,
  getTrustFix,
  listDevices,
  readInstall,
  readInstalledApp,
  readLeases,
  recordInstall,
};
