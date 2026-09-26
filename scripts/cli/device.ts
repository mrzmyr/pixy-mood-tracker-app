// One iOS simulator per checkout; one Android emulator per machine.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidBuildEnv } from "../run-native.ts";
import { CliError, getCheckoutDir, note } from "./shared.ts";
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
    return execFileSync(path.join(sdk, "platform-tools", "adb"), args, {
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

/** Creates and boots the device assigned to this checkout. */
export const ensureDevice = (platform: Platform) =>
  platform === "ios"
    ? Promise.resolve(ensureIosDevice())
    : ensureAndroidDevice();

/** Returns the agent-device selector for the platform. */
export const deviceFlag = (platform: Platform) =>
  platform === "ios" ? "--udid" : "--serial";
