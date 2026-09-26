// `bun simulators`: create simulators (iOS) and emulators (Android) for this
// project. agent-device boots and drives devices but cannot create them, so
// this is the only place that calls simctl directly.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidBuildEnv } from "../run-native.ts";

import { agentDevice } from "./agent-device.ts";
import {
  CliError,
  PLATFORM_OPTION,
  createSteps,
  defineCommand,
  getPlatform,
  note,
} from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

// The project slug, so every worktree finds and reuses the same simulator.
const SIMULATOR_NAME = "pixy-mood-tracker";
const DEFAULT_IOS_DEVICE_TYPE = "iPhone 17 Pro";
const DEFAULT_ANDROID_DEVICE_TYPE = "pixel_8";
const BOOT_TIMEOUT_MS = 180_000;

interface SimctlDevice {
  name: string;
  udid: string;
  isAvailable: boolean;
}

const simctl = (args: string[]) =>
  execFileSync("xcrun", ["simctl", ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  }).trim();

const findIosSimulator = (name: string) => {
  // SAFETY: `simctl list devices -j` prints { devices: { <runtime>: [...] } }.
  const { devices } = JSON.parse(simctl(["list", "devices", "-j"])) as {
    devices: Record<string, SimctlDevice[]>;
  };
  return (
    Object.values(devices)
      .flat()
      .find((device) => device.name === name && device.isAvailable) ?? null
  );
};

const listIosDeviceTypes = () =>
  simctl(["list", "devicetypes"])
    .split("\n")
    .flatMap(
      (line) => /^(?<name>iPhone[^(]+) \(/u.exec(line)?.groups?.name ?? []
    )
    .map((name) => name.trim());

const createIosSimulator = async (deviceType: string) => {
  const steps = createSteps();
  steps.step(
    `Find simulator "${SIMULATOR_NAME}"`,
    `xcrun simctl list devices | grep ${SIMULATOR_NAME}`
  );
  let udid = findIosSimulator(SIMULATOR_NAME)?.udid;
  if (udid) {
    note(`  ok: exists, reusing it`);
  } else {
    steps.step(
      `Create simulator "${SIMULATOR_NAME}" (${deviceType})`,
      `xcrun simctl create ${SIMULATOR_NAME} "${deviceType}"`
    );
    try {
      udid = simctl(["create", SIMULATOR_NAME, deviceType]);
    } catch (error) {
      throw new CliError({
        exitCode: 2,
        fix: `Pass one of: --device-type "${listIosDeviceTypes().join('", "')}".`,
        message: `Could not create a "${deviceType}" simulator`,
        status: "simulator_create_failed",
        why:
          error instanceof Error ? error.message.split("\n")[0] : String(error),
      });
    }
    note("  ok: created");
  }
  steps.step("Boot it", `bunx agent-device boot --platform ios --udid ${udid}`);
  await agentDevice(["boot", "--platform", "ios", "--udid", udid], {
    timeoutMs: BOOT_TIMEOUT_MS,
  });
  note("  ok: booted");
  steps.printTimings();
  note(
    `\nSimulator UDID: ${udid}\nRun the app: bun app run --device ${udid} --variant development`
  );
  console.log(udid);
};

// avdmanager and the system images live in the Android SDK. avdmanager needs
// a JDK, which getAndroidBuildEnv finds like `bun android` does.
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

// Newest installed system image, for example
// "system-images;android-36;google_apis_playstore;arm64-v8a".
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
      fix: 'Install one: `sdkmanager "system-images;android-36;google_apis;arm64-v8a"`.',
      message: "No Android system image installed",
      status: "system_image_missing",
      why: `${root} has no images.`,
    });
  }
  return `system-images;${newest.api};${newest.tag};${newest.abi}`;
};

const EMULATOR_LOG = "/tmp/pixy-mood-tracker-emulator.log";
const EMULATOR_BOOT_TIMEOUT_MS = 300_000;
// Device profiles reserve up to 12 GB for user data. Pixy needs far less.
const EMULATOR_ARGS = [
  "-avd",
  SIMULATOR_NAME,
  "-no-snapshot-save",
  "-partition-size",
  "4096",
];

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

// Serial of the running emulator for this AVD, like "emulator-5554".
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
          ?.trim() === SIMULATOR_NAME
    );

// agent-device's boot gives up after 90s and stops the emulator, but a fresh
// emulator needs longer. So this starts it directly and waits for Android's
// sys.boot_completed flag.
const bootAndroidEmulator = async (steps: ReturnType<typeof createSteps>) => {
  const env = { ...process.env, ...getAndroidBuildEnv() };
  const sdk = env.ANDROID_HOME;
  const emulator = path.join(sdk, "emulator", "emulator");
  steps.step("Boot it", `${emulator} ${EMULATOR_ARGS.join(" ")}`);
  let serial = findEmulatorSerial(sdk);
  let exited: ReturnType<typeof spawn> | null = null;
  if (serial) {
    note(`  ${serial} already runs`);
  } else {
    const log = fs.openSync(EMULATOR_LOG, "w");
    const child = spawn(emulator, EMULATOR_ARGS, {
      detached: true,
      env,
      stdio: ["ignore", log, log],
    });
    child.unref();
    exited = child;
    note(`  Follow along: tail -f ${EMULATOR_LOG}`);
  }
  const start = Date.now();
  let lastReport = 0;
  while (Date.now() - start < EMULATOR_BOOT_TIMEOUT_MS) {
    // The emulator logs "FATAL | <reason>" and exits when it cannot start.
    const fatal = fs.existsSync(EMULATOR_LOG)
      ? fs
          .readFileSync(EMULATOR_LOG, "utf-8")
          .split("\n")
          .find((line) => line.startsWith("FATAL"))
      : undefined;
    if (fatal || (exited !== null && exited.exitCode !== null)) {
      throw new CliError({
        fix: `Read ${EMULATOR_LOG}, fix the cause, then retry.`,
        message: "The emulator could not start",
        status: "emulator_start_failed",
        why:
          fatal?.replace(/^FATAL\s*\|\s*/u, "") ??
          `The emulator exited with ${exited?.exitCode}.`,
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
        `  ${Math.round((Date.now() - start) / 1000)}s: ${serial ? `${serial} still booting` : "waiting for the emulator to connect"}`
      );
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(3000);
  }
  throw new CliError({
    fix: `Read ${EMULATOR_LOG}. On a slow Mac, wait and run the command again; it reuses the running emulator.`,
    message: "The emulator did not finish booting",
    status: "emulator_boot_timeout",
    why: `sys.boot_completed was not 1 after ${EMULATOR_BOOT_TIMEOUT_MS / 1000}s.`,
  });
};

const createAndroidEmulator = async (deviceType: string) => {
  const steps = createSteps();
  steps.step(`Find emulator "${SIMULATOR_NAME}"`, "avdmanager list avd -c");
  const exists = avdmanager(["list", "avd", "-c"])
    .split("\n")
    .includes(SIMULATOR_NAME);
  if (exists) {
    note("  ok: exists, reusing it");
  } else {
    const image = findSystemImage();
    steps.step(
      `Create emulator "${SIMULATOR_NAME}" (${deviceType}, ${image})`,
      `echo no | avdmanager create avd -n ${SIMULATOR_NAME} -k "${image}" -d ${deviceType}`
    );
    try {
      // "no" answers the prompt for a custom hardware profile.
      avdmanager(
        ["create", "avd", "-n", SIMULATOR_NAME, "-k", image, "-d", deviceType],
        "no\n"
      );
    } catch (error) {
      throw new CliError({
        exitCode: 2,
        fix: "Pick a profile from `avdmanager list device -c` and pass --device-type <id>.",
        message: `Could not create a "${deviceType}" emulator`,
        status: "simulator_create_failed",
        why:
          error instanceof Error ? error.message.split("\n")[0] : String(error),
      });
    }
    note("  ok: created");
  }
  const serial = await bootAndroidEmulator(steps);
  note("  ok: booted");
  steps.printTimings();
  note(
    `\nEmulator serial: ${serial}\nRun the app: bun app run --device ${serial} --variant development`
  );
  console.log(serial);
};

const cmdCreate = async (
  platform: Platform,
  deviceType: string | undefined
) => {
  await (platform === "android"
    ? createAndroidEmulator(deviceType ?? DEFAULT_ANDROID_DEVICE_TYPE)
    : createIosSimulator(deviceType ?? DEFAULT_IOS_DEVICE_TYPE));
};

const SIMULATORS: Noun = {
  commands: {
    create: defineCommand({
      details: `--platform ios|android   Required.
--device-type <name>     iOS model (default: "${DEFAULT_IOS_DEVICE_TYPE}") or
                         Android profile (default: ${DEFAULT_ANDROID_DEVICE_TYPE}).

Creates "${SIMULATOR_NAME}" once and reuses it on later calls, then boots it
through agent-device. Prints the UDID on stdout.`,
      options: {
        ...PLATFORM_OPTION,
        "device-type": { type: "string" },
      },
      run: async (_args, values) => {
        const platform = getPlatform(values.platform);
        if (!platform) {
          throw new CliError({
            exitCode: 2,
            fix: "Pass --platform ios or --platform android.",
            message: "Missing --platform",
            status: "missing_platform",
            why: "iOS simulators and Android emulators are created differently.",
          });
        }
        await cmdCreate(platform, values["device-type"]);
      },
      summary: "Create and boot this project's simulator or emulator",
      usage: "--platform <ios|android> [options]",
    }),
  },
  footer:
    "List devices: `bun devices list`. Boot one: `bunx agent-device boot`.",
  summary: "Create simulators (iOS) and emulators (Android).",
};

/** `bun simulators` commands. */
export { SIMULATORS };
