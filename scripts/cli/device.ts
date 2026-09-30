// One iOS simulator per checkout; one Android emulator per machine.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidBuildEnv } from "../run-native.ts";
import { getAdb } from "./adb.ts";
import { setPhoneSession } from "./agent-device.ts";
import { CliError, getCheckoutDir, note } from "./shared.ts";
import { preflightPhone, readPhones } from "./phone.ts";
import { assertNotReserved } from "./reservation.ts";
import { buildRows, findPhone, toToken } from "./target.ts";
import type { Platform } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const IOS_NAME = `pixy-mood-tracker-${path.basename(getCheckoutDir(REPO_ROOT))}`;
const ANDROID_NAME = "pixy-mood-tracker";
const BOOT_TIMEOUT_MS = 180_000;
const EMULATOR_BOOT_TIMEOUT_MS = 300_000;
const EMULATOR_LOG = path.join(
  getCheckoutDir(REPO_ROOT),
  "android-emulator.log"
);

interface SimctlDevice {
  name: string;
  udid: string;
  state: string;
  isAvailable: boolean;
}

const simctl = (args: string[], timeout = 120_000) =>
  execFileSync("xcrun", ["simctl", ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
  }).trim();

const findIosSimulator = (): SimctlDevice | null => {
  // SAFETY: simctl list devices -j returns devices grouped by runtime.
  const { devices } = JSON.parse(simctl(["list", "devices", "-j"])) as {
    devices: Record<string, SimctlDevice[]>;
  };
  return (
    Object.values(devices)
      .flat()
      .find((device) => device.name === IOS_NAME && device.isAvailable) ?? null
  );
};

const ensureIosDevice = () => {
  let device = findIosSimulator();
  let id = device?.udid;
  if (!id) {
    try {
      id = simctl(["create", IOS_NAME, "iPhone 17 Pro"]);
      note(`Created simulator ${IOS_NAME}`);
    } catch (error) {
      throw new CliError({
        status: "simulator_create_failed",
        message: `Could not create simulator ${IOS_NAME}`,
        why: error instanceof Error ? error.message : String(error),
        fix: "Install the iPhone 17 Pro simulator runtime in Xcode, then retry.",
      });
    }
    device = findIosSimulator();
  }
  if (device?.state !== "Booted") {
    try {
      simctl(["boot", id]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("current state: Booted")) {
        throw new CliError({
          status: "simulator_boot_failed",
          message: `Could not boot simulator ${IOS_NAME}`,
          why: message,
          fix: "Check simulator status with `xcrun simctl list devices`, then retry.",
        });
      }
    }
    try {
      simctl(["bootstatus", id, "-b"], BOOT_TIMEOUT_MS);
    } catch (error) {
      throw new CliError({
        status: "simulator_boot_timeout",
        message: `Simulator ${IOS_NAME} did not finish booting`,
        why: error instanceof Error ? error.message : String(error),
        fix: "Check simulator status with `xcrun simctl list devices`, then retry.",
      });
    }
  }
  return { id, name: IOS_NAME };
};

// avdmanager needs a JDK; getAndroidBuildEnv finds it with the SDK.
const avdmanager = (args: string[], input?: string) => {
  const env = { ...process.env, ...getAndroidBuildEnv() };
  return execFileSync(
    path.join(env.ANDROID_HOME, "cmdline-tools", "latest", "bin", "avdmanager"),
    args,
    {
      encoding: "utf-8",
      env,
      input,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      timeout: 120_000,
    }
  ).trim();
};

const findSystemImage = () => {
  const root = path.join(getAndroidBuildEnv().ANDROID_HOME, "system-images");
  const images = fs.existsSync(root)
    ? fs.readdirSync(root).flatMap((api) =>
        fs.readdirSync(path.join(root, api)).flatMap((tag) =>
          fs.readdirSync(path.join(root, api, tag)).map((abi) => ({
            abi,
            api,
            level: Number(api.replace("android-", "")),
            tag,
          }))
        )
      )
    : [];
  const [newest] = images.toSorted((a, b) => b.level - a.level);
  if (!newest) {
    throw new CliError({
      status: "system_image_missing",
      message: "No Android system image installed",
      why: `${root} has no images.`,
      fix: 'Install one: `sdkmanager "system-images;android-36;google_apis;arm64-v8a"`.',
    });
  }
  return `system-images;${newest.api};${newest.tag};${newest.abi}`;
};

const tryAdb = (sdk: string, args: string[]) => {
  try {
    return execFileSync(getAdb(), args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15_000,
    }).trim();
  } catch {
    return "";
  }
};

const findEmulatorSerial = (sdk: string) =>
  tryAdb(sdk, ["devices"])
    .split("\n")
    .flatMap(
      (line) => /^(?<serial>emulator-\d+)\s/u.exec(line)?.groups?.serial ?? []
    )
    .find(
      (serial) =>
        tryAdb(sdk, ["-s", serial, "emu", "avd", "name"])
          .split("\n")[0]
          ?.trim() === ANDROID_NAME
    );

const EMULATOR_ARGS = [
  "-avd",
  ANDROID_NAME,
  "-no-snapshot-save",
  "-partition-size",
  "4096",
];

const bootAndroidEmulator = async () => {
  const env = { ...process.env, ...getAndroidBuildEnv() };
  const sdk = env.ANDROID_HOME;
  const emulator = path.join(sdk, "emulator", "emulator");
  let serial = findEmulatorSerial(sdk);
  let child: ReturnType<typeof spawn> | null = null;
  if (!serial) {
    const log = fs.openSync(EMULATOR_LOG, "w");
    child = spawn(emulator, EMULATOR_ARGS, {
      detached: true,
      env,
      stdio: ["ignore", log, log],
    });
    child.unref();
    note(`Booting Android emulator; log: ${EMULATOR_LOG}`);
  }
  const start = Date.now();
  let lastReport = 0;
  while (Date.now() - start < EMULATOR_BOOT_TIMEOUT_MS) {
    const fatal = fs.existsSync(EMULATOR_LOG)
      ? fs
          .readFileSync(EMULATOR_LOG, "utf-8")
          .split("\n")
          .find((line) => line.startsWith("FATAL"))
      : undefined;
    if (fatal || (child !== null && child.exitCode !== null)) {
      throw new CliError({
        status: "emulator_start_failed",
        message: "The emulator could not start",
        why: fatal ?? `The emulator exited with ${child?.exitCode}.`,
        fix: `Read ${EMULATOR_LOG}, fix the cause, then retry.`,
      });
    }
    serial ??= findEmulatorSerial(sdk);
    if (
      serial &&
      tryAdb(sdk, ["-s", serial, "shell", "getprop", "sys.boot_completed"]) ===
        "1"
    ) {
      return serial;
    }
    if (Date.now() - lastReport >= 15_000) {
      lastReport = Date.now();
      note(
        `Android emulator booting: ${Math.round((Date.now() - start) / 1000)}s`
      );
    }
    // oxlint-disable-next-line no-await-in-loop -- polling boot state
    await sleep(3000);
  }
  throw new CliError({
    status: "emulator_boot_timeout",
    message: "The emulator did not finish booting",
    why: `sys.boot_completed was not 1 after ${EMULATOR_BOOT_TIMEOUT_MS / 1000}s.`,
    fix: `Read ${EMULATOR_LOG}, then retry.`,
  });
};

const ensureAndroidDevice = async () => {
  const exists = avdmanager(["list", "avd", "-c"])
    .split("\n")
    .includes(ANDROID_NAME);
  if (!exists) {
    const image = findSystemImage();
    try {
      avdmanager(
        ["create", "avd", "-n", ANDROID_NAME, "-k", image, "-d", "pixel_8"],
        "no\n"
      );
    } catch (error) {
      throw new CliError({
        status: "emulator_create_failed",
        message: `Could not create emulator ${ANDROID_NAME}`,
        why: error instanceof Error ? error.message : String(error),
        fix: "Install the pixel_8 Android device profile, then retry.",
      });
    }
  }
  return { id: await bootAndroidEmulator(), name: ANDROID_NAME };
};

/** Finds this checkout's device without creating or booting it. */
export const findDevice = (platform: Platform) => {
  if (platform === "ios") {
    const device = findIosSimulator();
    return device
      ? {
          platform,
          kind: "simulator",
          id: device.udid,
          name: IOS_NAME,
          key: platform,
        }
      : null;
  }
  const serial = findEmulatorSerial(getAndroidBuildEnv().ANDROID_HOME);
  return serial
    ? {
        platform,
        kind: "emulator",
        id: serial,
        name: ANDROID_NAME,
        key: platform,
      }
    : null;
};

/** Reports whether this checkout's simulator or emulator is running. */
export const isDeviceBooted = (platform: Platform) =>
  platform === "ios"
    ? findIosSimulator()?.state === "Booted"
    : Boolean(findEmulatorSerial(getAndroidBuildEnv().ANDROID_HOME));

/** Creates and boots the device assigned to this checkout. */
export const ensureDevice = async (platform: Platform): Promise<Device> => {
  const managed =
    platform === "ios" ? ensureIosDevice() : await ensureAndroidDevice();
  return {
    ...managed,
    platform,
    kind: platform === "ios" ? "simulator" : "emulator",
    key: platform,
  };
};

/** Returns the agent-device selector for the platform. */
export const deviceFlag = (platform: Platform) =>
  platform === "ios" ? "--udid" : "--serial";

const iosState = (state?: string) => {
  if (!state) {
    return "not created";
  }
  return state === "Booted" ? "booted" : "shutdown";
};

const androidState = (booted?: boolean, exists?: boolean) => {
  if (booted) {
    return "booted";
  }
  return exists ? "shutdown" : "not created";
};

/** Read this checkout's managed device names and states without booting them. */
export const readManagedDevices = async () => {
  const ios = findIosSimulator();
  const androidExists = avdmanager(["list", "avd", "-c"])
    .split("\n")
    .includes(ANDROID_NAME);
  const agent = await import("./agent-device.ts")
    .then(({ agentDevice }) =>
      agentDevice<{
        devices: {
          kind: string;
          name: string;
          booted: boolean;
          claimedBy?: { workspace?: string };
        }[];
      }>(["devices"])
    )
    .catch(() => ({ devices: [] }));
  const iosAgent = agent.devices.find(
    (device) => device.kind === "simulator" && device.name === IOS_NAME
  );
  const androidAgent = agent.devices.find(
    (device) => device.kind === "emulator" && device.name === ANDROID_NAME
  );
  return [
    {
      platform: "ios" as const,
      name: IOS_NAME,
      id: ios?.udid,
      state: iosState(ios?.state),
      claimedBy: iosAgent?.claimedBy?.workspace,
    },
    {
      platform: "android" as const,
      name: ANDROID_NAME,
      id: androidAgent?.name,
      state: androidState(androidAgent?.booted, androidExists),
      claimedBy: androidAgent?.claimedBy?.workspace,
    },
  ];
};

/** Device selected by platform or phone target. `key` scopes artifacts per device. */
export interface Device {
  platform: Platform;
  kind: "simulator" | "emulator" | "phone";
  id: string;
  name: string;
  key: string;
}

/** Resolve one managed device or preflight one physical phone target. */
export const resolveDevice = async (values: {
  platform?: string;
  target?: string;
}): Promise<Device> => {
  if (values.platform) {
    const { platform } = values;
    if (platform !== "ios" && platform !== "android") {
      throw new CliError({
        exitCode: 2,
        status: "invalid_platform",
        message: `Invalid platform "${platform}"`,
        why: "Platform must be ios or android.",
        fix: "Pass --platform=ios or --platform=android.",
      });
    }
    return ensureDevice(platform);
  }
  if (!values.target) {
    throw new CliError({
      exitCode: 2,
      status: "missing_option",
      message: "Missing --platform or --target",
      why: "One device is required.",
      fix: "Pass exactly one device option.",
    });
  }
  const phoneData = await readPhones();
  const { phones } = phoneData;
  const candidates = phones.filter(
    (item) => item.kind === "device" && item.target === "mobile"
  );
  let phone;
  try {
    phone = findPhone(candidates, values.target);
  } catch (error) {
    if (!(error instanceof CliError) || error.status !== "target_not_found") {
      throw error;
    }
    const rows = buildRows({
      agentDevices: phones,
      iosDevices: phoneData.iosDevices,
      lockStates: phoneData.lockStates,
      adbStates: phoneData.adbStates,
      managed: [],
      repositoryRoot: REPO_ROOT,
    });
    const blocked = rows.filter((row) => row.state === "blocked");
    const valid = rows
      .filter((row) => row.kind === "phone" && row.option !== "-")
      .map((row) => row.option.replace("--target=", ""));
    const blockedWhy = blocked.length
      ? ` ${blocked.length} connected phone${blocked.length === 1 ? " is" : "s are"} blocked: ${blocked.map((row) => `${row.token} (${row.problem})`).join(", ")}.`
      : "";
    throw new CliError({
      exitCode: 2,
      status: "target_not_found",
      message: `No connected phone has target "${values.target}"`,
      why: `No matching phone is connected.${blockedWhy}`,
      fix: valid.length
        ? `Run \`bun devices list\` and pass one current target: ${valid.join(", ")}. Simulators and emulators use --platform.`
        : "No phone connected. Run `bun devices list` after connecting a phone.",
    });
  }
  const token = toToken(phone.name, phone.id);
  const device: Device = {
    platform: phone.platform,
    kind: "phone",
    id: phone.id,
    name: phone.name,
    key: token,
  };
  assertNotReserved(phone.id);
  await preflightPhone(device);
  setPhoneSession(token);
  note(`Using ${token}`);
  return device;
};
