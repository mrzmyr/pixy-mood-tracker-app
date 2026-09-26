// `bun app`: check a device, then build, install, and run the app on it. Every
// step prints the command it runs, so a person can repeat it by hand.
import { execFileSync, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS } from "../../app.config.ts";
import type { AppVariant } from "../../app.config.ts";
import {
  agentDevice,
  ensureDaemonSigningEnv,
  findAgentDevice,
  getAgentDeviceEnv,
  getRunnerBundleId,
  listAgentDevices,
} from "./agent-device.ts";
import type { AgentDevice } from "./agent-device.ts";
import { buildAndroid, buildIos } from "./app-build.ts";
import type { Destination } from "./app-build.ts";
import { listBuilds, toBuildId } from "./builds.ts";
import { assertDeviceFree, requireVariant } from "./e2e.ts";
import {
  RUNNER_TIMEOUT_MS,
  prepareRunnerArgs,
  toRunnerError,
  withProgress,
} from "./ios-runner.ts";
import { getAndroidSdk } from "../run-native.ts";
import {
  checkRunnerSigning,
  findRunnerCaches,
  hasXcodeAccount,
  includesPhone,
  matchesBundleId,
  readLocalProfiles,
  readProfile,
} from "./provisioning.ts";
import type { Profile } from "./provisioning.ts";
import { isRunnerStartFailure } from "./runner-error.ts";
import { REPO_ROOT } from "./runs.ts";
import {
  CliError,
  createSteps,
  defineCommand,
  getCheckoutDir,
  note,
  readJson,
  tryRun,
} from "./shared.ts";
import type { Noun, Platform, Steps } from "./shared.ts";

// A device from `--device <id|name>`, plus what the CLI derives from it.
interface SelectedDevice {
  device: AgentDevice;
  // Every device agent-device lists, for suggestions in errors.
  devices: AgentDevice[];
  platform: Platform;
  destination: Destination;
}

const pass = (message: string) => note(`  ok: ${message}`);

// Install, launch, or attach. Longer means the device is stuck.
const OPEN_TIMEOUT_MS = 120_000;

// agent-device flag for one device: --udid on iOS, --serial on Android.
const deviceFlag = (platform: Platform) =>
  platform === "ios" ? "--udid" : "--serial";

const selectDevice = async (
  steps: Steps,
  id: string
): Promise<SelectedDevice> => {
  steps.step(`Find device ${id}`, "bunx agent-device devices");
  const devices = await listAgentDevices();
  const { device, platform } = findAgentDevice(devices, id);
  if (device.kind !== "device" && !device.booted) {
    throw new CliError({
      fix: `Run \`bunx agent-device boot --platform ${platform} ${deviceFlag(platform)} ${device.id}\`, then retry.`,
      message: `${device.name} is not booted`,
      status: "device_not_booted",
      why: "Builds install only on a running simulator or emulator.",
    });
  }
  const isPhysical = device.kind === "device";
  pass(`${device.name} (${platform} ${isPhysical ? "physical" : device.kind})`);
  return {
    destination: isPhysical ? "device" : "simulator",
    device,
    devices,
    platform,
  };
};

const checkDeviceFree = async (
  steps: Steps,
  selected: SelectedDevice,
  isForce: boolean
) => {
  steps.step(
    "Check no other worktree uses the device",
    "bun e2e list && bunx agent-device device status"
  );
  if (isForce) {
    note("  skipped: --force");
    return;
  }
  await assertDeviceFree(selected.platform, selected.device.id);
  pass("free");
};

interface DevicectlDevice {
  hardwareProperties?: { udid?: string };
  connectionProperties?: { pairingState?: string };
  deviceProperties?: { developerModeStatus?: string };
}

const readIosPhone = (udid: string) => {
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-devicectl-${process.pid}.json`
  );
  try {
    execFileSync(
      "xcrun",
      ["devicectl", "list", "devices", "--json-output", file],
      { stdio: "ignore", timeout: 60_000 }
    );
    // SAFETY: devicectl --json-output writes { result: { devices: [...] } }.
    const { result } = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      result: { devices: DevicectlDevice[] };
    };
    return (
      result.devices.find(
        (device) => device.hardwareProperties?.udid === udid
      ) ?? null
    );
  } catch {
    return null;
  } finally {
    fs.rmSync(file, { force: true });
  }
};

const checkIosPhone = (steps: Steps, device: AgentDevice) => {
  steps.step(
    "Check the phone is paired and in Developer Mode",
    "xcrun devicectl list devices"
  );
  const phone = readIosPhone(device.id);
  if (!phone) {
    note("  warning: devicectl does not list the phone; the install may fail");
    return;
  }
  if (phone.connectionProperties?.pairingState !== "paired") {
    throw new CliError({
      fix: "Unlock the phone, tap Trust on the prompt, then retry.",
      message: `${device.name} is not paired with this Mac`,
      status: "phone_not_paired",
      why: `devicectl pairing state is "${phone.connectionProperties?.pairingState ?? "unknown"}".`,
    });
  }
  if (phone.deviceProperties?.developerModeStatus !== "enabled") {
    throw new CliError({
      fix: "On the phone, turn on Settings > Privacy & Security > Developer Mode, restart it, then retry.",
      message: `${device.name} has Developer Mode off`,
      status: "developer_mode_off",
      why: "iOS installs development builds only with Developer Mode on.",
    });
  }
  pass("paired, Developer Mode on");
};

// Passes when one profile includes the phone; otherwise suggests phones that
// the profiles include.
const assertProfileIncludes = (
  selected: SelectedDevice,
  bundleId: string,
  profiles: Profile[]
) => {
  const phone = selected.device;
  const covering = profiles.find((profile) => includesPhone(profile, phone.id));
  if (covering) {
    pass(`"${covering.name}" includes ${phone.name}`);
    return;
  }
  const covered = selected.devices
    .filter(
      (device) =>
        device.platform === "ios" &&
        device.kind === "device" &&
        profiles.some((profile) => profile.devices.includes(device.id))
    )
    .map((device) => `${device.name} (${device.id})`);
  throw new CliError({
    fix: [
      hasXcodeAccount()
        ? `Run \`bun app build --device ${phone.id} --variant <name>\`. It registers the phone in the Apple Developer portal and refreshes the profile.`
        : "Open Xcode > Settings > Accounts, add the Apple ID of the signing team, then retry. The build then registers the phone.",
      covered.length
        ? `Or pick a phone the profile includes: ${covered.join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    message: `No provisioning profile for ${bundleId} includes ${phone.name}`,
    status: "provisioning_device_missing",
    why: `Checked ${profiles.map((profile) => `"${profile.name}"`).join(", ")}. iOS refuses apps whose profile does not list the phone.`,
  });
};

// Pixy requests the aps-environment entitlement through expo-notifications,
// so profiles without Push Notifications (like the team wildcard) fail signing.
const checkLocalProfiles = (
  steps: Steps,
  selected: SelectedDevice,
  bundleId: string
) => {
  steps.step(
    `Check a provisioning profile for ${bundleId} with Push Notifications includes the phone`,
    'security cms -D -i "~/Library/Developer/Xcode/UserData/Provisioning Profiles/<file>.mobileprovision"'
  );
  const profiles = readLocalProfiles().filter(
    (profile) =>
      profile.expires > Date.now() &&
      profile.hasPush &&
      matchesBundleId(profile, bundleId)
  );
  if (profiles.length === 0) {
    if (!hasXcodeAccount()) {
      throw new CliError({
        fix: "Open Xcode > Settings > Accounts, add the Apple ID of the signing team, then retry. The build then creates the profile.",
        message: `No provisioning profile with Push Notifications for ${bundleId}`,
        status: "xcode_account_missing",
        why: "Xcode has no Apple ID signed in, so -allowProvisioningUpdates cannot create the profile. The team wildcard profile lacks Push Notifications.",
      });
    }
    note(
      `  warning: no local profile with Push Notifications for ${bundleId}. Xcode creates one during the build.`
    );
    return;
  }
  // Not fatal: device builds register the phone and refresh the profile.
  const phone = selected.device;
  const covering = profiles.find((profile) => includesPhone(profile, phone.id));
  if (covering) {
    pass(`"${covering.name}" includes ${phone.name}`);
    return;
  }
  if (!hasXcodeAccount()) {
    assertProfileIncludes(selected, bundleId, profiles);
  }
  note(
    `  warning: no local profile for ${bundleId} includes ${phone.name}. The build registers the phone in the Apple Developer portal and refreshes the profile.`
  );
};

const physicalIphone = (selected: SelectedDevice) =>
  selected.platform === "ios" && selected.destination === "device"
    ? selected.device
    : undefined;

// agent-device drives physical iPhones through its own runner app, signed
// apart from Pixy. Fails early instead of at install with 0xe8008012. Never
// moves files itself: another worktree may run the cached runner right now,
// and provisioning profiles belong to Xcode.
const checkRunnerProfile = (steps: Steps, selected: SelectedDevice) => {
  steps.step(
    "Check the agent-device runner's provisioning profile includes the phone",
    'security cms -D -i "~/.agent-device/apple-runner/derived/ios-device/<cache>/Build/Products/Debug-iphoneos/AgentDeviceRunner.app/embedded.mobileprovision"'
  );
  const env = getAgentDeviceEnv();
  const phone = selected.device;
  const result = checkRunnerSigning({
    bundleId: getRunnerBundleId(),
    caches: findRunnerCaches(
      env.AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH?.trim() || undefined
    ).map(({ dir, files }) => ({ dir, profiles: files.map(readProfile) })),
    localProfiles: readLocalProfiles(),
    now: Date.now(),
    teamId: env.AGENT_DEVICE_IOS_TEAM_ID?.trim() || undefined,
    udid: phone.id,
  });
  if (result.status === "ok") {
    pass(
      `"${result.profile.name}" (${result.source === "cache" ? "cached runner" : "local profile"}) includes ${phone.name}`
    );
    return;
  }
  if (result.status === "unknown") {
    note(
      "  warning: no cached runner and no local profile for it. Xcode creates the profile when agent-device builds the runner."
    );
    return;
  }
  const stale = [
    ...result.caches,
    ...result.profiles.map((profile) => profile.file),
  ];
  throw new CliError({
    fix: [
      hasXcodeAccount()
        ? ""
        : "Open Xcode > Settings > Accounts and add the Apple ID of the signing team.",
      `Move the stale files aside, then retry: ${stale.map((file) => `mv "${file}" ~/.Trash/`).join(" && ")}.`,
      "agent-device then rebuilds the runner, and Xcode fetches a fresh team profile.",
      `If the fresh profile still lacks the phone, register the phone first: \`bun app build --device ${phone.id} --variant <name>\`.`,
    ]
      .filter(Boolean)
      .join(" "),
    message: `agent-device runner profile does not include ${phone.name}`,
    status: "runner_provisioning_device_missing",
    why: [
      ...result.caches.map(
        (dir) =>
          `Cached runner in ${dir} is signed with a profile that is expired or lacks the phone.`
      ),
      ...result.profiles.map(
        (profile) =>
          `Local profile "${profile.name}" (${profile.file}) lacks the phone.`
      ),
      "iOS refuses such a runner with 0xe8008012.",
    ].join(" "),
  });
};

const runDoctorChecks = async (
  steps: Steps,
  selected: SelectedDevice,
  variant: AppVariant,
  isForce: boolean
) => {
  await checkDeviceFree(steps, selected, isForce);
  if (selected.platform === "ios" && selected.destination === "device") {
    checkIosPhone(steps, selected.device);
    checkLocalProfiles(steps, selected, APP_VARIANTS[variant].appId);
    await ensureDaemonSigningEnv(steps);
  }
};

const cmdDoctor = async (options: {
  id: string;
  variant: AppVariant;
  isForce: boolean;
}) => {
  const steps = createSteps();
  const selected = await selectDevice(steps, options.id);
  await runDoctorChecks(steps, selected, options.variant, options.isForce);
  if (physicalIphone(selected)) {
    checkRunnerProfile(steps, selected);
  }
  note("\nAll checks passed.");
};

// adb from the Android SDK the build uses. Only this CLI calls it.
const getAdb = () => {
  const sdk = getAndroidSdk();
  if (!sdk) {
    throw new CliError({
      fix: "Install Android SDK packages and set ANDROID_HOME to the SDK path.",
      message: "Android SDK not found",
      status: "android_sdk_missing",
      why: "adb is needed to reach Metro and set app preferences on Android.",
    });
  }
  return path.join(sdk, "platform-tools", "adb");
};

const adb = (serial: string, args: string[], input?: string) =>
  execFileSync(getAdb(), ["-s", serial, ...args], {
    encoding: "utf-8",
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    timeout: 60_000,
  }).trim();

// Compiles, or reuses a cached build; returns the build ID. For a physical
// iPhone, compiles again when the cached build's profile lacks the phone.
const buildApp = async (
  steps: Steps,
  options: {
    platform: Platform;
    destination: Destination;
    variant: AppVariant;
    isRebuild: boolean;
    phone?: AgentDevice;
  }
) => {
  const { phone } = options;
  const key =
    options.platform === "android"
      ? await buildAndroid(options, steps)
      : await buildIos(
          {
            ...options,
            canReuse: phone
              ? (app) => {
                  const profile = readProfile(
                    path.join(app, "embedded.mobileprovision")
                  );
                  return profile !== null && includesPhone(profile, phone.id);
                }
              : undefined,
            phoneId: phone?.id,
          },
          steps
        );
  return toBuildId(key);
};

const cmdBuild = async (options: {
  id?: string;
  destination?: string;
  variant: AppVariant;
  isRebuild: boolean;
}) => {
  const steps = createSteps();
  let platform: Platform = "ios";
  let destination: Destination;
  let phone: AgentDevice | undefined;
  if (options.id) {
    const selected = await selectDevice(steps, options.id);
    if (options.destination && options.destination !== selected.destination) {
      throw new CliError({
        exitCode: 2,
        fix: "Drop --destination; --device decides it.",
        message: `--destination ${options.destination} does not match ${selected.device.name}`,
        status: "destination_mismatch",
        why: `${selected.device.name} needs a ${selected.destination} build.`,
      });
    }
    ({ destination, platform } = selected);
    phone = physicalIphone(selected);
  } else if (
    options.destination === "device" ||
    options.destination === "simulator"
  ) {
    ({ destination } = options);
  } else {
    throw new CliError({
      exitCode: 2,
      fix: "Pass --device <id|name>, or --destination simulator|device when no device is connected (CI).",
      message: options.destination
        ? `Unknown --destination "${options.destination}"`
        : "Missing --device or --destination",
      status: "missing_destination",
      why: "Simulator and physical device builds use different CPU targets.",
    });
  }
  const buildId = await buildApp(steps, {
    destination,
    isRebuild: options.isRebuild,
    phone,
    platform,
    variant: options.variant,
  });
  steps.printTimings();
  note(
    `\nBuild ID: ${buildId}\nInstall: bun app install ${buildId} --device <id|name>`
  );
  console.log(buildId);
};

interface AppBuild {
  // .app is iOS, .apk is Android.
  platform: Platform;
  path: string;
  // iOS bundle ID or Android package name.
  bundleId: string;
  // iphoneos for physical devices, iphonesimulator for simulators, android
  // for APKs, which run on both.
  sdk: string;
  // Cache metadata, for builds from the cache.
  metaFile: string | null;
}

const readInfoPlist = (app: string, key: string) =>
  tryRun("plutil", [
    "-extract",
    key,
    "raw",
    "-o",
    "-",
    path.join(app, "Info.plist"),
  ]);

// Package name of an APK: from the cache metadata, else from aapt2 in the
// newest SDK build tools.
const readApkPackage = (apk: string, appVariant: string | undefined) => {
  const variant = Object.entries(APP_VARIANTS).find(
    ([name]) => name === appVariant
  )?.[1];
  if (variant) {
    return variant.appId;
  }
  const sdk = getAndroidSdk();
  const buildTools = sdk ? path.join(sdk, "build-tools") : null;
  const newest =
    buildTools && fs.existsSync(buildTools)
      ? fs.readdirSync(buildTools).toSorted().at(-1)
      : undefined;
  const name =
    buildTools && newest
      ? tryRun(path.join(buildTools, newest, "aapt2"), [
          "dump",
          "packagename",
          apk,
        ])
      : null;
  if (!name) {
    throw new CliError({
      fix: "Pass a cached build ID from `bun builds list`, or install Android build tools.",
      message: `Could not read the package name of ${path.basename(apk)}`,
      status: "build_invalid",
      why: "No cache metadata and no aapt2 in the Android SDK build tools.",
    });
  }
  return name;
};

// <build-id> is a cache ID from `bun builds list` or a path to a .app or .apk.
const resolveBuild = (steps: Steps, value: string): AppBuild => {
  steps.step(`Resolve build ${value}`, "bun builds list");
  const cached = listBuilds().find(
    (build) => build.id === value || build.key === value
  );
  const appPath =
    cached?.file ?? (fs.existsSync(value) ? path.resolve(value) : null);
  if (!appPath) {
    throw new CliError({
      exitCode: 2,
      fix: "Run `bun builds list` and pass an ID, or pass a path to a .app. Create one with `bun app build`.",
      message: `No build "${value}"`,
      status: "build_not_found",
      why: "<build-id> is neither a cached build ID nor an existing path.",
    });
  }
  const metaFile = cached
    ? cached.file.replace(/\.(?:app|apk)$/u, ".json")
    : null;
  if (appPath.endsWith(".apk")) {
    const bundleId = readApkPackage(appPath, cached?.meta.appVariant);
    pass(`${bundleId}, Android APK for phones and emulators`);
    return {
      bundleId,
      metaFile,
      path: appPath,
      platform: "android",
      sdk: "android",
    };
  }
  if (!appPath.endsWith(".app")) {
    throw new CliError({
      exitCode: 2,
      fix: "Pass an iOS .app or an Android .apk build.",
      message: `${path.basename(appPath)} is not an app build`,
      status: "build_unsupported",
      why: "bun app install supports .app (iOS) and .apk (Android).",
    });
  }
  const bundleId = readInfoPlist(appPath, "CFBundleIdentifier");
  const sdk = readInfoPlist(appPath, "DTPlatformName");
  if (!bundleId || !sdk) {
    throw new CliError({
      fix: "Create a new build with `bun app build`.",
      message: `${path.basename(appPath)} has no readable Info.plist`,
      status: "build_invalid",
      why: "CFBundleIdentifier or DTPlatformName is missing.",
    });
  }
  pass(
    `${bundleId}, built for ${sdk === "iphoneos" ? "physical devices" : "simulators"}`
  );
  return { bundleId, metaFile, path: appPath, platform: "ios", sdk };
};

const assertBuildFitsDevice = (build: AppBuild, selected: SelectedDevice) => {
  const isDeviceBuild = build.sdk === "iphoneos";
  if (isDeviceBuild === (selected.destination === "device")) {
    return;
  }
  throw new CliError({
    fix: `Create a matching build: \`bun app build --device ${selected.device.id} --variant <name>\`.`,
    message: `Build is for ${isDeviceBuild ? "physical devices" : "simulators"}, ${selected.device.name} is ${isDeviceBuild ? "a simulator" : "a physical device"}`,
    status: "build_target_mismatch",
    why: "Simulator and physical device builds use different CPU targets.",
  });
};

// The profile Xcode embedded at build time decides where the app installs.
const checkEmbeddedProfile = (
  steps: Steps,
  build: AppBuild,
  selected: SelectedDevice
) => {
  const file = path.join(build.path, "embedded.mobileprovision");
  steps.step(
    "Check the build's provisioning profile includes the phone",
    `security cms -D -i ${file}`
  );
  const profile = readProfile(file);
  if (!profile) {
    throw new CliError({
      fix: `Create a device build: \`bun app build --device ${selected.device.id} --variant <name>\`.`,
      message: "Build has no provisioning profile",
      status: "build_unsigned",
      why: `${file} is missing or unreadable.`,
    });
  }
  assertProfileIncludes(selected, build.bundleId, [profile]);
};

// Marks a cached build as used, so `bun builds prune` keeps it.
const touchBuild = (metaFile: string | null) => {
  const meta = metaFile ? readJson<{ lastUsedAt?: string }>(metaFile) : null;
  if (!metaFile || !meta) {
    return;
  }
  const tmp = `${metaFile}.${process.pid}.tmp`;
  fs.writeFileSync(
    tmp,
    `${JSON.stringify({ ...meta, lastUsedAt: new Date().toISOString() }, null, 2)}\n`
  );
  fs.renameSync(tmp, metaFile);
};

// Checks the build fits the device, then installs it.
// The build the CLI last installed per device and app, with the device's
// install stamp at that time.
const INSTALLS_FILE = path.join(
  os.homedir(),
  ".cache",
  "pixy-mood-tracker",
  "installs.json"
);

interface InstallRecord {
  build: string;
  stamp: string;
}

// Path plus when the cache stored it: `--rebuild` stores a new build at the
// same path. File times do not work, because copying keeps the compiler
// output's time. Builds outside the cache fall back to the file time.
const getBuildIdentity = (build: AppBuild) => {
  const meta = build.metaFile
    ? readJson<{ createdAt?: string }>(build.metaFile)
    : null;
  return `${build.path}@${meta?.createdAt ?? fs.statSync(build.path).mtimeMs}`;
};

const readIosAppUrl = (udid: string, bundleId: string) => {
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-devicectl-apps-${process.pid}.json`
  );
  try {
    execFileSync(
      "xcrun",
      [
        "devicectl",
        "device",
        "info",
        "apps",
        "--device",
        udid,
        "--bundle-id",
        bundleId,
        "--json-output",
        file,
      ],
      { stdio: "ignore", timeout: 60_000 }
    );
    // SAFETY: devicectl --json-output writes { result: { apps: [...] } }.
    const { result } = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      result: { apps: { url?: string }[] };
    };
    return result.apps[0]?.url ?? null;
  } catch {
    return null;
  } finally {
    fs.rmSync(file, { force: true });
  }
};

// Changes on every install, also installs outside this CLI: Android's
// lastUpdateTime, or the iOS bundle path, which gets a new UUID per install.
// Null when the app is missing or the device does not answer.
const getInstallStamp = (selected: SelectedDevice, bundleId: string) => {
  const { id } = selected.device;
  if (selected.platform === "android") {
    const dump = tryRun(getAdb(), [
      "-s",
      id,
      "shell",
      "dumpsys",
      "package",
      bundleId,
    ]);
    return /lastUpdateTime=(?<time>.+)/u.exec(dump ?? "")?.groups?.time ?? null;
  }
  return selected.destination === "simulator"
    ? tryRun("xcrun", ["simctl", "get_app_container", id, bundleId, "app"])
    : readIosAppUrl(id, bundleId);
};

const getInstallKey = (selected: SelectedDevice, bundleId: string) =>
  `${selected.device.id}:${bundleId}`;

const isInstalled = (selected: SelectedDevice, build: AppBuild) => {
  const installs = readJson<Record<string, InstallRecord>>(INSTALLS_FILE);
  const record = installs?.[getInstallKey(selected, build.bundleId)];
  if (!record || record.build !== getBuildIdentity(build)) {
    return false;
  }
  return record.stamp === getInstallStamp(selected, build.bundleId);
};

// A lost update between parallel runs only costs one extra install.
const recordInstall = (selected: SelectedDevice, build: AppBuild) => {
  const stamp = getInstallStamp(selected, build.bundleId);
  if (!stamp) {
    return;
  }
  const installs = readJson<Record<string, InstallRecord>>(INSTALLS_FILE) ?? {};
  installs[getInstallKey(selected, build.bundleId)] = {
    build: getBuildIdentity(build),
    stamp,
  };
  const tmp = `${INSTALLS_FILE}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(INSTALLS_FILE), { recursive: true });
  fs.writeFileSync(tmp, `${JSON.stringify(installs, null, 2)}\n`);
  fs.renameSync(tmp, INSTALLS_FILE);
};

const installBuild = async (
  steps: Steps,
  build: AppBuild,
  selected: SelectedDevice,
  // Skip when the device still has the build this CLI installed last.
  canSkip = false
) => {
  if (build.platform !== selected.platform) {
    throw new CliError({
      exitCode: 2,
      fix: `Create a matching build: \`bun app build --device ${selected.device.id} --variant <name>\`.`,
      message: `Build is for ${build.platform}, ${selected.device.name} is ${selected.platform}`,
      status: "build_target_mismatch",
      why: "iOS and Android builds only install on their own platform.",
    });
  }
  if (canSkip) {
    steps.step(
      `Check ${selected.device.name} already has this build`,
      `pass --reinstall to install anyway`
    );
    if (isInstalled(selected, build)) {
      pass("same build installed, skipping install");
      touchBuild(build.metaFile);
      return;
    }
    pass("different or unknown build, installing");
  }
  if (build.platform === "android") {
    const { device } = selected;
    steps.step(
      `Install on ${device.name}`,
      `bunx agent-device install ${build.bundleId} ${build.path} --platform android --serial ${device.id}`
    );
    await agentDevice(
      [
        "install",
        build.bundleId,
        build.path,
        "--platform",
        "android",
        "--serial",
        device.id,
      ],
      { timeoutMs: OPEN_TIMEOUT_MS }
    );
    pass("installed");
    recordInstall(selected, build);
    touchBuild(build.metaFile);
    return;
  }
  assertBuildFitsDevice(build, selected);
  if (selected.destination === "device") {
    checkEmbeddedProfile(steps, build, selected);
  }
  const { device } = selected;
  steps.step(
    `Install on ${device.name}`,
    `bunx agent-device install ${build.bundleId} ${build.path} --platform ios --udid ${device.id}`
  );
  try {
    await agentDevice([
      "install",
      build.bundleId,
      build.path,
      "--platform",
      "ios",
      "--udid",
      device.id,
    ]);
  } catch (error) {
    // A stuck CoreDevice connection makes devicectl hang or report the phone
    // as not ready, often after an XCTest runner session.
    if (
      error instanceof CliError &&
      /timed out|not ready for automation/u.test(error.message)
    ) {
      throw new CliError({
        fix: "Restart Apple's device service with `pkill -f CoreDeviceService` (macOS relaunches it), then retry. If it fails again, replug the cable.",
        message: `Installing on ${device.name} failed`,
        status: "coredevice_stuck",
        why: error.message,
      });
    }
    throw error;
  }
  pass("installed");
  recordInstall(selected, build);
  touchBuild(build.metaFile);
};

const describeNext = (bundleId: string) => {
  const variant = Object.values(APP_VARIANTS).find(
    ({ appId }) => appId === bundleId
  );
  return bundleId === APP_VARIANTS.development.appId
    ? `Next: start Metro with \`bun start\`, then open ${variant?.name} on the device. Or use \`bun app run\`.`
    : `Next: open ${variant?.name ?? bundleId} on the device.`;
};

const cmdInstall = async (options: {
  buildId: string;
  id: string;
  isForce: boolean;
}) => {
  const steps = createSteps();
  const build = resolveBuild(steps, options.buildId);
  const selected = await selectDevice(steps, options.id);
  await checkDeviceFree(steps, selected, options.isForce);
  if (selected.destination === "device") {
    checkIosPhone(steps, selected.device);
  }
  if (physicalIphone(selected)) {
    await ensureDaemonSigningEnv(steps);
  }
  await installBuild(steps, build, selected);
  steps.printTimings();
  note(`\n${describeNext(build.bundleId)}`);
};

const METRO_PORT = 8081;
// Per checkout, so worktrees never read or stop each other's Metro.
const METRO_LOG = path.join(getCheckoutDir(REPO_ROOT), "metro.log");
// Written by `app run`, so `app close` stops only a Metro this CLI started.
const METRO_PID = path.join(getCheckoutDir(REPO_ROOT), "metro.pid");

const isMetroRunning = async () => {
  try {
    const response = await fetch(`http://localhost:${METRO_PORT}/status`, {
      signal: AbortSignal.timeout(1000),
    });
    const body = await response.text();
    return body.includes("packager-status:running");
  } catch {
    return false;
  }
};

// Stops Metro's process group by PID and removes the PID file. A dead PID is
// skipped.
const stopMetro = (pid: number | undefined) => {
  if (!pid) {
    return false;
  }
  fs.rmSync(METRO_PID, { force: true });
  try {
    process.kill(-pid, "SIGINT");
    return true;
  } catch {
    return false;
  }
};

// Starts Metro (`bun start`) unless one already runs on the port. Returns the
// process this CLI started, or null.
const startMetro = async (steps: Steps) => {
  steps.step("Start Metro", "bun start");
  if (await isMetroRunning()) {
    note(
      `  Metro already runs on port ${METRO_PORT}. Reusing it; stop it first if another worktree started it.`
    );
    return null;
  }
  const log = fs.openSync(METRO_LOG, "w");
  // Own process group, so Metro outlives `bun app run` and `stopMetro` also
  // stops the Expo process that `bun start` launches.
  const child = spawn("bun", ["start"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  fs.writeFileSync(METRO_PID, `${child.pid}\n`);
  const deadline = Date.now() + 120_000;
  // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
  while (!(await isMetroRunning())) {
    if (child.exitCode !== null || Date.now() > deadline) {
      stopMetro(child.pid);
      throw new CliError({
        fix: `Read ${METRO_LOG}, fix the error, then retry.`,
        message: "Metro did not start",
        status: "metro_start_failed",
        why:
          child.exitCode === null
            ? `No answer on port ${METRO_PORT} within 2 minutes.`
            : `\`bun start\` exited with ${child.exitCode}.`,
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(1000);
  }
  pass(`running on port ${METRO_PORT}, log: ${METRO_LOG}`);
  return child;
};

// One screen check or screenshot. Longer means the device or runner is stuck.
const CHECK_TIMEOUT_MS = 30_000;

// `is` exits with an error when the predicate does not hold. The last error
// explains a failed check. A runner that cannot start fails every check, so
// its error ends the wait at once. `deadline` shortens the last check, so a
// polling loop stops close to its own deadline.
let lastCheckError = "";
const isVisible = async (selector: string, deadline = Infinity) => {
  try {
    await agentDevice(["is", "visible", selector], {
      timeoutMs: Math.max(
        1000,
        Math.min(CHECK_TIMEOUT_MS, deadline - Date.now())
      ),
    });
    return true;
  } catch (error) {
    if (isRunnerStartFailure(error)) {
      throw new CliError({
        fix: error.fix,
        message: "agent-device cannot start its runner on the device",
        status: "agent_device_runner_failed",
        why: `agent-device ${error.status}: ${error.message}. ${error.why}`,
      });
    }
    lastCheckError = `${selector}: ${error instanceof CliError ? `${error.status}: ${error.message}` : String(error)}`;
    return false;
  }
};

// Dev client deep link with Metro's LAN address, so a phone loads the bundle
// from this Mac.
// Simulators run on this Mac and reach Metro on localhost; phones need the
// Mac's LAN address.
const getDevClientUrl = (isLocal: boolean) => {
  const host = isLocal
    ? "localhost"
    : (tryRun("ipconfig", ["getifaddr", "en0"]) ??
      tryRun("ipconfig", ["getifaddr", "en1"]));
  if (!host) {
    throw new CliError({
      fix: "Connect the Mac and the phone to the same Wi-Fi, then retry.",
      message: "No LAN address for Metro",
      status: "lan_address_missing",
      why: "`ipconfig getifaddr en0` and `en1` returned nothing, so the phone cannot reach Metro.",
    });
  }
  const url = encodeURIComponent(`http://${host}:${METRO_PORT}`);
  return `${APP_VARIANTS.development.scheme}://expo-development-client/?url=${url}`;
};

const runOpen = async (
  steps: Steps,
  title: string,
  selected: SelectedDevice,
  args: string[]
) => {
  const full = [
    "open",
    ...args,
    "--platform",
    selected.platform,
    deviceFlag(selected.platform),
    selected.device.id,
  ];
  steps.step(title, `bunx agent-device ${full.join(" ")}`);
  await agentDevice(full, { timeoutMs: OPEN_TIMEOUT_MS });
  pass("open");
};

// On the first launch after install, Expo's launcher shows "Finding Dev
// Servers" with a Next button. Next triggers the iOS Local Network alert.
// Without Allow, the phone cannot reach Metro.
const LAUNCHER_PERMISSION_SCREEN = 'label="Finding Dev Servers"';
const LAUNCHER_NEXT = 'label="Next"';

const waitForAlert = async () => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
      return await agentDevice<{ message: string; items: string[] }>(
        ["alert", "get"],
        { timeoutMs: CHECK_TIMEOUT_MS }
      );
    } catch {
      // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
      await sleep(1000);
    }
  }
  return null;
};

const acceptLocalNetworkAlert = async (alert: { message: string } | null) => {
  if (!alert || !/local network/iu.test(alert.message)) {
    throw new CliError({
      fix: "Look at the device, answer the prompt by hand, then retry.",
      message: "Expected the Local Network alert",
      status: "unexpected_alert",
      why: alert
        ? `The alert says "${alert.message}". The CLI accepts only the Local Network alert.`
        : "No alert appeared within 10s after pressing Next.",
    });
  }
  await agentDevice(["alert", "accept"], { timeoutMs: CHECK_TIMEOUT_MS });
  pass(`allowed: "${alert.message}"`);
};

// iOS asks once per install. It shows the system alert directly, or Expo's
// launcher shows "Finding Dev Servers" with Next first. Returns true when
// this run granted access.
const allowLocalNetwork = async (steps: Steps) => {
  steps.step(
    "Allow Local Network access, if iOS asks",
    "bunx agent-device alert get && bunx agent-device alert accept"
  );
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each check reads the current screen
    const alert = await agentDevice<{ message: string }>(["alert", "get"], {
      timeoutMs: CHECK_TIMEOUT_MS,
    }).catch(() => null);
    if (alert) {
      // oxlint-disable-next-line no-await-in-loop -- one alert, then done
      await acceptLocalNetworkAlert(alert);
      return true;
    }
    // oxlint-disable-next-line no-await-in-loop -- each check reads the current screen
    if (await isVisible(LAUNCHER_PERMISSION_SCREEN)) {
      note(`  bunx agent-device press '${LAUNCHER_NEXT}'`);
      // oxlint-disable-next-line no-await-in-loop -- the press opens the alert
      await agentDevice(["press", LAUNCHER_NEXT], {
        timeoutMs: CHECK_TIMEOUT_MS,
      });
      // oxlint-disable-next-line no-await-in-loop -- one alert, then done
      await acceptLocalNetworkAlert(await waitForAlert());
      return true;
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(1000);
  }
  pass("already allowed");
  return false;
};

// Expo's developer menu opens on every launch of a development build, with an
// intro on the first one. Both cover the app. iOS launch arguments (devicectl, simctl) override
// the registered defaults for this launch only; people who open the app
// normally still get the menu. The menu stays reachable by shaking the phone.
const DEV_MENU_LAUNCH_ARGS = [
  "-EXDevMenuShowsAtLaunch",
  "NO",
  "-EXDevMenuIsOnboardingFinished",
  "YES",
];

// One launch with the Metro URL and the launch arguments that hide Expo's
// developer menu. --terminate-existing restarts a running app.
const launchWithDevicectl = (
  steps: Steps,
  device: AgentDevice,
  bundleId: string,
  url: string
) => {
  const args = [
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    device.id,
    "--terminate-existing",
    "--payload-url",
    url,
    bundleId,
    // Without "--", devicectl reads the app's arguments as its own options.
    "--",
    ...DEV_MENU_LAUNCH_ARGS,
  ];
  steps.step(
    `Launch the app on ${device.name} with Metro's URL`,
    `xcrun ${args.map((arg) => (arg.includes("?") ? `"${arg}"` : arg)).join(" ")}`
  );
  try {
    execFileSync("xcrun", args, {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 60_000,
    });
  } catch (error) {
    const stderr =
      error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    throw new CliError({
      fix: "Unlock the phone and retry. If it fails again, run `pkill -f CoreDeviceService` and retry.",
      message: `Launching the app on ${device.name} failed`,
      status: "launch_failed",
      why:
        stderr
          .split("\n")
          .find((line) => line.startsWith("Error:"))
          ?.trim() ?? (error instanceof Error ? error.message : String(error)),
    });
  }
  pass("launched");
};

const launchOnSimulator = (
  steps: Steps,
  device: AgentDevice,
  bundleId: string,
  url: string
) => {
  const launch = [
    "simctl",
    "launch",
    "--terminate-running-process",
    device.id,
    bundleId,
    ...DEV_MENU_LAUNCH_ARGS,
  ];
  const openUrl = ["simctl", "openurl", device.id, url];
  steps.step(
    `Launch the app on ${device.name} with Metro's URL`,
    `xcrun ${launch.join(" ")} && xcrun ${openUrl.slice(0, -1).join(" ")} "${url}"`
  );
  for (const args of [launch, openUrl]) {
    try {
      execFileSync("xcrun", args, {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: 60_000,
      });
    } catch (error) {
      throw new CliError({
        fix: `Check the simulator is booted: \`bunx agent-device devices --platform ios\`. Then retry.`,
        message: `Launching the app on ${device.name} failed`,
        status: "launch_failed",
        why: `\`xcrun ${args.join(" ")}\`: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      });
    }
  }
  pass("launched");
};

// Simulators ask `Open in "Pixy Dev"?` when simctl opens the app's URL
// scheme. Only that alert is accepted; iOS may skip it after the first time.
const confirmOpenUrl = async (steps: Steps) => {
  steps.step(
    "Confirm opening Metro's URL, if iOS asks",
    "bunx agent-device alert get && bunx agent-device press 'label=\"Open\"'"
  );
  const alert = await waitForAlert();
  if (!alert) {
    pass("no confirmation needed");
    return;
  }
  if (!alert.message.startsWith("Open in “Pixy")) {
    throw new CliError({
      fix: "Look at the simulator, answer the prompt by hand, then retry.",
      message: "Expected the Open in Pixy confirmation",
      status: "unexpected_alert",
      why: `The alert says "${alert.message}". The CLI accepts only the Open in Pixy confirmation here.`,
    });
  }
  // `alert accept` times out on this system dialog; pressing its button works.
  await agentDevice(["press", 'label="Open"'], { timeoutMs: CHECK_TIMEOUT_MS });
  pass(`pressed Open on "${alert.message}"`);
};

const DEV_MENU_PREFERENCES = "expo.modules.devmenu.sharedpreferences";

// Android has no launch arguments. Expo's developer menu reads the same two
// settings from SharedPreferences, so they are written before the launch.
// Debug builds allow `run-as`. They persist until the app data is cleared.
const hideAndroidDevMenu = (steps: Steps, serial: string, pkg: string) => {
  const xml =
    '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n<map>\n  <boolean name="showsAtLaunch" value="false" />\n  <boolean name="isOnboardingFinished" value="true" />\n</map>\n';
  const command = `run-as ${pkg} sh -c 'mkdir -p shared_prefs && cat > shared_prefs/${DEV_MENU_PREFERENCES}.xml'`;
  steps.step(
    "Hide Expo's developer menu at launch",
    `adb -s ${serial} shell "${command}" < <preferences xml>`
  );
  adb(serial, ["shell", "am", "force-stop", pkg]);
  adb(serial, ["shell", command], xml);
  pass(`wrote shared_prefs/${DEV_MENU_PREFERENCES}.xml`);
};

// A sleeping screen gives black screenshots and no element tree. Wake it and
// dismiss a lock screen without PIN; a PIN lock makes the check fail.
const wakeAndroidScreen = (steps: Steps, serial: string) => {
  steps.step(
    "Wake the screen",
    `adb -s ${serial} shell input keyevent KEYCODE_WAKEUP && adb -s ${serial} shell wm dismiss-keyguard`
  );
  adb(serial, ["shell", "input", "keyevent", "KEYCODE_WAKEUP"]);
  adb(serial, ["shell", "wm", "dismiss-keyguard"]);
  pass("screen on");
};

// USB forwards the device's localhost:8081 to Metro on this Mac, so phones
// need no Wi-Fi and no Local Network permission.
const openOnAndroid = async (
  steps: Steps,
  selected: SelectedDevice,
  pkg: string
) => {
  const serial = selected.device.id;
  wakeAndroidScreen(steps, serial);
  hideAndroidDevMenu(steps, serial, pkg);
  steps.step(
    "Forward Metro's port to the device",
    `adb -s ${serial} reverse tcp:${METRO_PORT} tcp:${METRO_PORT}`
  );
  adb(serial, ["reverse", `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  pass(`device localhost:${METRO_PORT} reaches Metro`);
  await runOpen(
    steps,
    `Open the app on ${selected.device.name} with Metro's URL`,
    selected,
    [pkg, getDevClientUrl(true)]
  );
};

// Stops every Pixy variant on an Android device.
const quitAndroidApps = (serial: string, packages: string[]) => {
  for (const pkg of packages) {
    note(`  Quitting ${pkg}: adb -s ${serial} shell am force-stop ${pkg}`);
    adb(serial, ["shell", "am", "force-stop", pkg]);
  }
};

const openApp = async (
  steps: Steps,
  selected: SelectedDevice,
  bundleId: string,
  isDevelopment: boolean
) => {
  const { name } = selected.device;
  if (!isDevelopment) {
    await runOpen(steps, `Open the app on ${name}`, selected, [bundleId]);
    return;
  }
  if (selected.platform === "android") {
    await openOnAndroid(steps, selected, bundleId);
    return;
  }
  if (selected.destination === "simulator") {
    // Metro hints alone leave the dev client on its launcher. simctl launches
    // with the launch arguments, then sends Metro's URL to the running app.
    // agent-device's open restarts the app on simulators, without launch
    // arguments. So attach first; the simctl launch after it wins.
    await runOpen(steps, "Attach agent-device", selected, [bundleId]);
    launchOnSimulator(steps, selected.device, bundleId, getDevClientUrl(true));
    await confirmOpenUrl(steps);
    return;
  }
  // Physical iPhones: agent-device cannot combine launch arguments with a
  // deep link there. devicectl passes both in one launch; agent-device then
  // attaches to the running app for the checks.
  const url = getDevClientUrl(false);
  const launch = () =>
    launchWithDevicectl(steps, selected.device, bundleId, url);
  launch();
  await runOpen(steps, "Attach agent-device to the running app", selected, [
    bundleId,
  ]);
  if (await allowLocalNetwork(steps)) {
    // The first connection attempt failed without access. Launch again.
    launch();
  }
};

// Starts the runner before any screen check, so a first runner build does
// not eat the 30s check and 2-minute verify budgets.
const prepareIosRunner = async (steps: Steps, selected: SelectedDevice) => {
  if (selected.platform !== "ios") {
    return;
  }
  const args = prepareRunnerArgs(selected.device.id);
  steps.step(
    "Start the agent-device runner",
    `bunx agent-device ${args.join(" ")}`
  );
  note(
    `  First use on ${selected.device.name} builds the runner: several minutes. Later runs reuse it.`
  );
  try {
    await withProgress(
      agentDevice(args, { timeoutMs: RUNNER_TIMEOUT_MS + 30_000 }),
      (seconds) => note(`  ${seconds}s: still starting the runner`)
    );
  } catch (error) {
    throw toRunnerError(
      error instanceof Error ? error : new Error(String(error))
    );
  }
  pass("runner ready");
};

const SCREENSHOT = "/tmp/pixy-mood-tracker-app-run.png";
const SNAPSHOT = "/tmp/pixy-mood-tracker-app-run.snapshot.txt";

// The app rendered its first screen: the Calendar tab of the main app, or the
// Start button of onboarding on a fresh install. agent-device does not match
// the emoji label "Welcome 👋", so onboarding uses its button.
// Onboarding covers the main app, and on Android the Calendar tab behind it
// stays in the tree. So Start is checked first.
// The role is needed on Android, where the button's text node carries the
// same label.
const READY_SELECTORS = ['role="button" label="Start"', 'id="calendar"'];
const READY_TIMEOUT_MS = 120_000;
// "Go home" exists only in Expo's developer menu.
const DEV_MENU_OPEN = 'label="Go home"';

const waitForBundle = async () => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
  while (!/Bundled/u.test(fs.readFileSync(METRO_LOG, "utf-8"))) {
    if (Date.now() > deadline) {
      throw new CliError({
        fix: `Read ${METRO_LOG}. On first launch, allow Local Network access on the device, then retry.`,
        message: "The app did not load its JS bundle",
        status: "bundle_not_loaded",
        why: "Metro served no bundle within 2 minutes after the app opened.",
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(1000);
  }
  pass("Metro served the JS bundle");
};

// Proves the app runs without a person looking at the device: waits until
// the first screen is visible.
// The screenshot is evidence, taken after the check passed or failed.
const verifyApp = async (steps: Steps, metro: ChildProcess | null) => {
  steps.step(
    "Verify the app shows its first screen",
    `bunx agent-device is visible '${READY_SELECTORS[0]}'`
  );
  if (metro) {
    await waitForBundle();
  }
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let ready: string | undefined;
  while (!ready && Date.now() < deadline) {
    // Expo's developer menu covers the app but leaves its elements in the
    // tree, so a ready marker alone is not enough.
    // oxlint-disable-next-line no-await-in-loop -- each check reads the current screen
    if (await isVisible(DEV_MENU_OPEN, deadline)) {
      lastCheckError = `Expo's developer menu covers the app (${DEV_MENU_OPEN} is visible)`;
      // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
      await sleep(1000);
      continue;
    }
    for (const selector of READY_SELECTORS) {
      if (
        !ready &&
        Date.now() < deadline &&
        // oxlint-disable-next-line no-await-in-loop -- stop at the first visible marker
        (await isVisible(selector, deadline))
      ) {
        ready = selector;
      }
    }
    if (!ready) {
      // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
      await sleep(1000);
    }
  }
  // Screens fade in; a screenshot mid-animation looks washed out. Best effort:
  // a screen that never settles still gets its screenshot.
  try {
    await agentDevice(["wait", "stable", "500", "5000"], {
      timeoutMs: CHECK_TIMEOUT_MS,
    });
  } catch {
    // Unsettled screen: take the screenshot anyway.
  }
  await agentDevice(["screenshot", SCREENSHOT], {
    timeoutMs: CHECK_TIMEOUT_MS,
  });
  if (!ready) {
    // The element tree shows which labels the screen really has.
    let tree = "";
    try {
      tree = JSON.stringify(
        await agentDevice(["snapshot", "-i"], { timeoutMs: CHECK_TIMEOUT_MS }),
        null,
        2
      );
    } catch (error) {
      tree = error instanceof Error ? error.message : "snapshot failed";
    }
    fs.writeFileSync(SNAPSHOT, `${tree}\n`);
    throw new CliError({
      fix: `Look at ${SCREENSHOT} and ${SNAPSHOT} to see what the device shows, fix the cause, then retry.`,
      message: "The app did not show its first screen",
      status: "app_not_ready",
      why: `None of ${READY_SELECTORS.join(", ")} became visible within ${READY_TIMEOUT_MS / 1000}s. Last check: ${lastCheckError}`,
    });
  }
  pass(`${ready} is visible, screenshot: ${SCREENSHOT}`);
};

// agent-device `close` ends the session but leaves the app running on
// physical iPhones. devicectl quits it, so the phone shows the home screen.
// Executable name of an app variant. Expo sets PRODUCT_NAME to the app
// name without spaces or special characters: "Pixy Dev" runs as "PixyDev".
const toExecutable = (name: string) => name.replaceAll(/[^a-zA-Z0-9]/gu, "");

const quitIosApp = (udid: string, executables: string[]) => {
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-processes-${process.pid}.json`
  );
  try {
    execFileSync(
      "xcrun",
      [
        "devicectl",
        "device",
        "info",
        "processes",
        "--device",
        udid,
        "--json-output",
        file,
      ],
      { stdio: "ignore", timeout: 60_000 }
    );
    // SAFETY: devicectl --json-output writes { result: { runningProcesses } }.
    const { result } = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      result: {
        runningProcesses: { executable?: string; processIdentifier: number }[];
      };
    };
    const running = result.runningProcesses.filter((candidate) =>
      executables.some((executable) =>
        candidate.executable?.endsWith(`.app/${executable}`)
      )
    );
    for (const { executable, processIdentifier } of running) {
      note(
        `  Quitting ${path.basename(executable ?? "app")}: xcrun devicectl device process terminate --device ${udid} --pid ${processIdentifier}`
      );
      execFileSync(
        "xcrun",
        [
          "devicectl",
          "device",
          "process",
          "terminate",
          "--device",
          udid,
          "--pid",
          String(processIdentifier),
        ],
        { stdio: "ignore", timeout: 60_000 }
      );
    }
    return running.length;
  } catch (error) {
    note(
      `warning: could not quit the app (${error instanceof Error ? error.message : String(error)}).`
    );
  } finally {
    fs.rmSync(file, { force: true });
  }
};

// Ends the agent-device session: closes the app and releases the device.
const closeSession = async () => {
  note("Closing the app and releasing the device...");
  try {
    await agentDevice(["close"]);
  } catch (error) {
    note(
      `warning: close failed (${error instanceof Error ? error.message : String(error)}). Run \`bunx agent-device close\`.`
    );
  }
};

const cmdRun = async (options: {
  id: string;
  variant: AppVariant;
  isRebuild: boolean;
  isReinstall: boolean;
  isForce: boolean;
}) => {
  const steps = createSteps();
  const selected = await selectDevice(steps, options.id);
  await runDoctorChecks(steps, selected, options.variant, options.isForce);
  const isDevelopment = options.variant === "development";
  // Started before the build, so Metro is warm when the app opens.
  const metro = isDevelopment ? await startMetro(steps) : null;
  // On failure, clean up everything this run started. On success, leave the
  // app open and Metro running, and exit.
  let isOpen = false;
  let appPath: string | null = null;
  try {
    const buildId = await buildApp(steps, {
      destination: selected.destination,
      isRebuild: options.isRebuild,
      phone: physicalIphone(selected),
      platform: selected.platform,
      variant: options.variant,
    });
    const build = resolveBuild(steps, buildId);
    appPath = build.path;
    await installBuild(steps, build, selected, !options.isReinstall);
    // After the build, which registers a new phone in the portal.
    if (physicalIphone(selected)) {
      checkRunnerProfile(steps, selected);
    }
    isOpen = true;
    await prepareIosRunner(steps, selected);
    await openApp(steps, selected, build.bundleId, isDevelopment);
    await verifyApp(steps, metro);
    // Ends the session, which removes the automation overlay. The app stays
    // open on physical iPhones.
    steps.step(
      "Release the device",
      `bunx agent-device close --platform ${selected.platform}`
    );
    await agentDevice(["close", "--platform", selected.platform]);
    isOpen = false;
    pass("released; the app stays open");
  } catch (error) {
    if (isOpen) {
      await closeSession();
      if (selected.platform === "android") {
        quitAndroidApps(selected.device.id, [
          APP_VARIANTS[options.variant].appId,
        ]);
      } else if (appPath && selected.destination === "device") {
        const executable = readInfoPlist(appPath, "CFBundleExecutable");
        quitIosApp(selected.device.id, executable ? [executable] : []);
      }
    }
    stopMetro(metro?.pid);
    throw error;
  }
  steps.printTimings();
  note(
    metro
      ? `\nApp open. Metro runs in the background (PID ${metro.pid}, log: ${METRO_LOG}).\nClose the app and stop Metro: bun app close --device ${selected.device.id}`
      : `\nApp open. Close it: bun app close --device ${selected.device.id}`
  );
};

const cmdClose = async (options: {
  id: string;
  isForce: boolean;
  variant?: AppVariant;
}) => {
  const steps = createSteps();
  const variants = options.variant
    ? [APP_VARIANTS[options.variant]]
    : Object.values(APP_VARIANTS);
  const selected = await selectDevice(steps, options.id);
  await checkDeviceFree(steps, selected, options.isForce);
  steps.step(
    "Close this worktree's agent-device session",
    `bunx agent-device close --platform ${selected.platform}`
  );
  try {
    await agentDevice(["close", "--platform", selected.platform]);
    pass("closed");
  } catch {
    pass("no open session");
  }
  if (selected.platform === "android") {
    steps.step(
      "Quit Pixy apps on the device",
      `adb -s ${selected.device.id} shell am force-stop <package>`
    );
    quitAndroidApps(
      selected.device.id,
      variants.map(({ appId }) => appId)
    );
    pass("stopped");
  } else if (selected.destination === "device") {
    steps.step(
      "Quit Pixy apps on the phone",
      `xcrun devicectl device info processes --device ${selected.device.id}`
    );
    const count =
      quitIosApp(
        selected.device.id,
        variants.map(({ name }) => toExecutable(name))
      ) ?? 0;
    pass(count > 0 ? `quit ${count} app(s)` : "none running");
  }
  // Metro serves only the development variant.
  if (!options.variant || options.variant === "development") {
    steps.step(
      "Stop Metro started by bun app run",
      `kill -INT $(cat ${METRO_PID})`
    );
    const pid = fs.existsSync(METRO_PID)
      ? Math.trunc(Number(fs.readFileSync(METRO_PID, "utf-8")))
      : Number.NaN;
    pass(
      stopMetro(Number.isInteger(pid) ? pid : undefined)
        ? "stopped"
        : "not running"
    );
  }
  if (selected.destination === "simulator") {
    const flag = deviceFlag(selected.platform);
    steps.step(
      `Shut down ${selected.device.name}`,
      `bunx agent-device shutdown --platform ${selected.platform} ${flag} ${selected.device.id}`
    );
    await agentDevice([
      "shutdown",
      "--platform",
      selected.platform,
      flag,
      selected.device.id,
    ]);
    pass("shut down");
  }
};

const requireDevice = (value: string | undefined) => {
  if (!value) {
    throw new CliError({
      exitCode: 2,
      fix: "Find one with `bun devices list`, then pass --device <id|name>.",
      message: "Missing --device",
      status: "missing_device",
      why: "Without a device, the command may land on a device another worktree is using.",
    });
  }
  return value;
};

// --variant has no default in `bun app`: development and preview differ in
// bundle ID, configuration, and whether Metro is needed.
const requireVariantFlag = (value: string | undefined) => {
  if (!value) {
    throw new CliError({
      exitCode: 2,
      fix: `Pass --variant ${Object.keys(APP_VARIANTS).join(", --variant ")}.`,
      message: "Missing --variant",
      status: "missing_variant",
      why: "development is Debug with Metro; preview and production are Release builds with the JS inside.",
    });
  }
  return requireVariant(value);
};

const APP: Noun = {
  commands: {
    doctor: defineCommand({
      details: `--device <id|name>  Required. ID or name from \`bun devices list\`.
                    Platform and simulator/physical come from the device.
--variant <name>    Required. development, preview, or production.
--force             Skip the check that no other worktree uses the device.

Checks, in order: agent-device answers with the pinned version, device exists
and runs, no other worktree uses it, and for iPhones: paired, Developer Mode on,
provisioning profiles of the app and of the agent-device runner include it.`,
      options: {
        device: { type: "string" },
        force: { type: "boolean" },
        variant: { type: "string" },
      },
      run: async (_args, values) => {
        await cmdDoctor({
          id: requireDevice(values.device),
          isForce: values.force ?? false,
          variant: requireVariantFlag(values.variant),
        });
      },
      summary: "Check a device is ready for a build",
      usage: "--device <id|name> [options]",
    }),
    build: defineCommand({
      details: `--device <id|name>               Picks simulator or physical build from the device.
--destination simulator|device   Override when no device is given (CI).
--variant <name>                 Required. development, preview, or production.
--rebuild                        Compile even when a cached build exists.

Prints the build ID on stdout. Reuses a cached build with the same key.
Progress and log path go to stderr. Android not supported yet.`,
      options: {
        destination: { type: "string" },
        device: { type: "string" },
        rebuild: { type: "boolean" },
        variant: { type: "string" },
      },
      run: async (_args, values) => {
        await cmdBuild({
          destination: values.destination,
          id: values.device,
          isRebuild: values.rebuild ?? false,
          variant: requireVariantFlag(values.variant),
        });
      },
      summary: "Compile one app variant for a device and cache it",
      usage: "[options]",
    }),
    install: defineCommand({
      args: ["<build-id>"],
      argsSource: "bun builds list",
      details: `<build-id>          ID from \`bun builds list\`, or path to a .app.
--device <id|name>  Required.
--force             Skip the check that no other worktree uses the device.

Runs the doctor checks, checks the build fits the device (simulator vs
physical, embedded provisioning profile), then installs through agent-device.`,
      options: {
        device: { type: "string" },
        force: { type: "boolean" },
      },
      run: async ([buildId], values) => {
        await cmdInstall({
          buildId,
          id: requireDevice(values.device),
          isForce: values.force ?? false,
        });
      },
      summary: "Install a cached build on a device",
      usage: "<build-id> --device <id|name> [options]",
    }),
    run: defineCommand({
      details: `--rebuild           Compile even when a cached build exists.
--reinstall         Install even when the device has the same build.
--force             Skip the worktree ownership check.

development starts Metro first. Exits once the app shows its first screen:
the app stays open, Metro keeps running in the background. Stop both with
\`bun app close\`. Replaces \`bun ios\`, \`bun ios:preview\`.`,
      options: {
        device: { type: "string" },
        force: { type: "boolean" },
        rebuild: { type: "boolean" },
        reinstall: { type: "boolean" },
        variant: { type: "string" },
      },
      run: async (_args, values) => {
        await cmdRun({
          id: requireDevice(values.device),
          isForce: values.force ?? false,
          isRebuild: values.rebuild ?? false,
          isReinstall: values.reinstall ?? false,
          variant: requireVariantFlag(values.variant),
        });
      },
      summary: "Doctor, build, install, and open in one go",
      usage: "--device <id|name> --variant <name> [options]",
    }),
    close: defineCommand({
      details: `--device <id|name>  Required.
--variant <name>    Quit only this variant: development, preview, or production.
                    Default: all variants.
--force             Skip the check that no other worktree uses the device.

Closes this worktree's agent-device session, quits Pixy apps on a device,
stops a Metro that \`bun app run\` started, and shuts down a simulator or
emulator. Shutdown quits every app, so --variant matters only on physical
devices. With a --variant other than development, Metro keeps running. Use it
after an interrupted run, \`bun e2e run\`, or manual agent-device commands.`,
      options: {
        device: { type: "string" },
        force: { type: "boolean" },
        variant: { type: "string" },
      },
      run: async (_args, values) => {
        await cmdClose({
          id: requireDevice(values.device),
          isForce: values.force ?? false,
          variant:
            values.variant === undefined
              ? undefined
              : requireVariant(values.variant),
        });
      },
      summary: "Close the app, release the device, shut down simulators",
      usage: "--device <id|name> [--variant <name>] [options]",
    }),
  },
  footer: "Devices: `bun devices list`. Build cache: `bun builds`.",
  summary: "Build, install, and run the app on one device.",
};

/** `bun app` commands. */
export { APP };
