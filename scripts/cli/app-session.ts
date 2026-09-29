import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS } from "../../app.config.ts";
import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import {
  agentDevice,
  ensureDaemonSigningEnv,
  getAgentDeviceEnv,
  getRunnerBundleId,
  stopStaleDaemon,
} from "./agent-device.ts";
import { getAdb } from "./adb.ts";
import { pruneBuilds } from "./builds.ts";
import {
  checkRunnerSigning,
  findRunnerCaches,
  hasXcodeAccount,
  readLocalProfiles,
  readProfile,
} from "./provisioning.ts";
import {
  prepareRunnerArgs,
  RUNNER_TIMEOUT_MS,
  toRunnerError,
  withProgress,
} from "./ios-runner.ts";
import { isRunnerStartFailure } from "./runner-error.ts";
import { deviceFlag, findDevice, resolveDevice } from "./device.ts";
import type { Device } from "./device.ts";
import { getPlatform } from "./options.ts";
import { CliError, getStateDir, note } from "./shared.ts";
import type { Platform } from "./shared.ts";
import {
  clearPhoneAppData,
  openIosPhoneLink,
  preflightPhone,
  stopPhoneApp,
  uninstallPhoneApp,
} from "./phone.ts";

const PREVIEW = APP_VARIANTS.preview;
const READY_SELECTORS = ['role="button" label="Start"', 'id="calendar"'];
const READY_TIMEOUT_MS = 120_000;

const checkRunnerProfile = (device: Device) => {
  const env = getAgentDeviceEnv();
  const result = checkRunnerSigning({
    bundleId: getRunnerBundleId(),
    caches: findRunnerCaches(
      env.AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH?.trim() || undefined
    ).map(({ dir, files }) => ({ dir, profiles: files.map(readProfile) })),
    localProfiles: readLocalProfiles(),
    now: Date.now(),
    teamId: env.AGENT_DEVICE_IOS_TEAM_ID?.trim() || undefined,
    udid: device.id,
  });
  if (result.status === "ok") {
    note(
      `Runner profile "${result.profile.name}" (${result.source}) includes ${device.name}`
    );
    return;
  }
  if (result.status === "unknown") {
    note(
      "No cached runner or local profile. Xcode creates runner profile during prepare."
    );
    return;
  }
  const stale = [
    ...result.caches,
    ...result.profiles.map((profile) => profile.file),
  ];
  throw new CliError({
    status: "runner_provisioning_device_missing",
    message: `Runner profile does not include ${device.name}`,
    why: "Cached runner or local profile is expired or does not include this iPhone.",
    fix: `${hasXcodeAccount() ? "" : "Add the signing Apple ID in Xcode Settings > Accounts. "}Move stale profiles aside (${stale.join(", ")}), then retry.`,
  });
};

const prepareIosRunner = async (device: Device) => {
  if (device.kind !== "phone" || device.platform !== "ios") {
    return;
  }
  await stopStaleDaemon();
  await ensureDaemonSigningEnv();
  checkRunnerProfile(device);
  try {
    await withProgress(
      agentDevice(prepareRunnerArgs(device.id), {
        timeoutMs: RUNNER_TIMEOUT_MS,
      }),
      (seconds) => note(`iPhone runner starting: ${seconds}s`)
    );
  } catch (error) {
    if (isRunnerStartFailure(error)) {
      throw toRunnerError(error);
    }
    throw error;
  }
};

export { prepareIosRunner };

const platformFor = (values: Record<string, string | undefined>) =>
  getPlatform(values.platform);

const getDeviceArgs = (platform: Platform, id: string) => [
  "--platform",
  platform,
  deviceFlag(platform),
  id,
];

const waitReady = async (
  platform: Platform,
  id: string,
  key = platform,
  selectors = READY_SELECTORS
) => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- inspect current screen
        await agentDevice(
          ["is", "visible", selector, ...getDeviceArgs(platform, id)],
          { timeoutMs: 10_000 }
        );
        return selector;
      } catch (error) {
        const isNotVisible =
          error instanceof CliError &&
          ([
            "assertion_failed",
            "element_not_found",
            "not_visible",
            "is_not_visible",
            "agent_device_timeout",
          ].includes(error.status) ||
            (error.status === "command_failed" &&
              error.why.startsWith("selector_not_found")));
        if (!isNotVisible) {
          throw error;
        }
      }
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for first screen
    await sleep(1000);
  }
  const dir = path.join(getStateDir("screenshots"), key);
  fs.mkdirSync(dir, { recursive: true });
  const screenshot = path.join(dir, "not-ready.png");
  const snapshot = path.join(dir, "not-ready.snapshot.txt");
  await agentDevice(["screenshot", screenshot, ...getDeviceArgs(platform, id)]);
  const tree = await agentDevice([
    "snapshot",
    "-i",
    ...getDeviceArgs(platform, id),
  ]);
  fs.writeFileSync(snapshot, `${JSON.stringify(tree, null, 2)}\n`);
  throw new CliError({
    status: "app_not_ready",
    message: "App did not show its first screen",
    why: "Neither onboarding Start button nor calendar appeared within 120 seconds.",
    fix: `Inspect ${screenshot} and ${snapshot}, fix the cause, then retry.`,
  });
};

const screenshot = async (
  platform: Platform,
  id: string,
  name: string,
  key = platform
) => {
  const dir = path.join(getStateDir("screenshots"), key);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  await agentDevice(["screenshot", file, ...getDeviceArgs(platform, id)]);
  console.log(file);
};

// iOS holds a link launch behind "Open in ...?". Until the prompt or the app
// is up, agent-device answers "is not running".
const ALERT_ATTEMPTS = 15;

const readAlert = async (platform: Platform, id: string) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- polling until app or prompt is up
      return await agentDevice<{ message: string }>([
        "alert",
        "get",
        ...getDeviceArgs(platform, id),
      ]);
    } catch (error) {
      const isStarting =
        error instanceof CliError && error.message.includes("is not running");
      if (!isStarting || attempt === ALERT_ATTEMPTS) {
        throw error;
      }
    }
    // oxlint-disable-next-line no-await-in-loop -- polling until app or prompt is up
    await sleep(1000);
  }
};

const acceptPreviewAlert = async (platform: Platform, id: string) => {
  if (platform !== "ios") {
    return;
  }
  try {
    const alert = await readAlert(platform, id);
    if (!alert.message.startsWith("Open in “Pixy")) {
      throw new CliError({
        status: "unexpected_alert",
        message: "Unexpected iOS alert",
        why: `Alert says "${alert.message}".`,
        fix: "Dismiss the alert on the simulator, then retry.",
      });
    }
    await agentDevice([
      "press",
      'label="Open"',
      ...getDeviceArgs(platform, id),
    ]);
  } catch (error) {
    const isMissingAlert =
      error instanceof CliError &&
      (error.status === "alert_not_found" ||
        (error.status === "command_failed" &&
          error.message === "alert not found"));
    if (!isMissingAlert) {
      throw error;
    }
  }
};

const open = async (device: Device) => {
  const { platform } = device;
  if (device.kind === "phone") {
    preflightPhone(device);
    await prepareIosRunner(device);
  }
  await agentDevice(
    [
      "open",
      PREVIEW.appId,
      ...getDeviceArgs(platform, device.id),
      "--relaunch",
    ],
    { timeoutMs: READY_TIMEOUT_MS }
  );
  await acceptPreviewAlert(platform, device.id);
  await waitReady(platform, device.id, device.key);
  await screenshot(platform, device.id, "open.png", device.key);
};

const seed = async (device: Device, fixtureId: string) => {
  const { platform } = device;
  const fixture = FIXTURES.find((candidate) => candidate.id === fixtureId);
  if (!fixture) {
    throw new CliError({
      exitCode: 2,
      status: "fixture_not_found",
      message: `Unknown fixture "${fixtureId}"`,
      why: "No fixture has that ID.",
      fix: `Use one of: ${FIXTURES.map((candidate) => candidate.id).join(", ")}.`,
    });
  }
  if (device.kind === "phone") {
    preflightPhone(device);
    await prepareIosRunner(device);
  }
  const url = `${PREVIEW.scheme}://dev/fixture?id=${fixtureId}`;
  // iOS asks "Open in ...?" before a link launches the app. The CLI can
  // answer it only while the app runs, so the app starts first.
  if (device.kind === "phone" || platform === "ios") {
    await agentDevice([
      "open",
      PREVIEW.appId,
      ...getDeviceArgs(platform, device.id),
      "--relaunch",
    ]);
    await waitReady(platform, device.id, device.key);
  }
  if (device.kind === "phone" && platform === "ios") {
    openIosPhoneLink(device, PREVIEW.appId, url);
  } else {
    await agentDevice([
      "open",
      ...(device.kind === "phone" ? [url] : [PREVIEW.appId, url]),
      ...getDeviceArgs(platform, device.id),
    ]);
    await acceptPreviewAlert(platform, device.id);
  }
  await waitReady(
    platform,
    device.id,
    device.key,
    fixtureId === "seed" ? ['id="calendar-list"'] : READY_SELECTORS
  );
  if (fixtureId === "seed") {
    const { items } = fixture.data;
    if (!Array.isArray(items) || items.length === 0) {
      throw new CliError({
        status: "fixture_invalid",
        message: "Seed fixture has no entries",
        why: "Calendar screenshot needs an entry date, but seed data has none.",
        fix: "Restore entries in src/dev/fixtures/seed.json, then retry.",
      });
    }
    let latest = items[0].date;
    for (const item of items) {
      if (item.date > latest) {
        latest = item.date;
      }
    }
    await agentDevice(
      [
        "scroll",
        "up",
        "--until",
        `id="calendar-day-${latest}"`,
        ...getDeviceArgs(platform, device.id),
      ],
      { timeoutMs: READY_TIMEOUT_MS }
    );
  }
  await screenshot(platform, device.id, `seed-${fixtureId}.png`, device.key);
};

const ignoreMissingSession = async (args: string[]) => {
  try {
    await agentDevice(args);
  } catch (error) {
    if (
      !(
        error instanceof CliError &&
        ["session_not_found", "no_open_session"].includes(error.status)
      )
    ) {
      throw error;
    }
  }
};

const closePhone = async (phone: Device) => {
  await preflightPhone(phone);
  if (phone.platform === "android") {
    stopPhoneApp(phone, PREVIEW.appId, PREVIEW.name);
    const result = clearPhoneAppData(phone, PREVIEW.appId);
    if (result !== "Success") {
      throw new CliError({
        status: "app_clear_failed",
        message: `${phone.key}: preview app data was not cleared`,
        why: `pm clear returned "${result}".`,
        fix: "Check phone state and retry close.",
      });
    }
    await ignoreMissingSession([
      "close",
      ...getDeviceArgs(phone.platform, phone.id),
    ]);
  } else {
    await ignoreMissingSession([
      "close",
      ...getDeviceArgs(phone.platform, phone.id),
    ]);
    stopPhoneApp(phone, PREVIEW.appId, PREVIEW.name);
    uninstallPhoneApp(phone, PREVIEW.appId);
  }
  await pruneBuilds();
  note("Closed phone session");
};

const clearAndroidData = (deviceId: string) => {
  try {
    const result = execFileSync(
      getAdb(),
      ["-s", deviceId, "shell", "pm", "clear", PREVIEW.appId],
      { encoding: "utf-8" }
    ).trim();
    if (result !== "Success") {
      throw new CliError({
        status: "app_clear_failed",
        message: "Android app data was not cleared",
        why: `pm clear returned "${result}".`,
        fix: "Check emulator state and retry close.",
      });
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      status: "app_clear_failed",
      message: "Android app data could not be cleared",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check emulator state and retry close.",
    });
  }
};

const waitForAndroidShutdown = async (id: string) => {
  const deadline = Date.now() + 60_000;
  while (true) {
    let devices: string;
    try {
      devices = execFileSync(getAdb(), ["devices"], { encoding: "utf-8" });
    } catch (error) {
      throw new CliError({
        status: "emulator_shutdown_check_failed",
        message: "Could not check Android emulator shutdown",
        why: error instanceof Error ? error.message : String(error),
        fix: "Check Android SDK and emulator state, then retry close.",
      });
    }
    if (!devices.split("\n").some((line) => line.startsWith(`${id}\t`))) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new CliError({
        status: "emulator_shutdown_timeout",
        message: "Android emulator did not shut down",
        why: `Emulator ${id} was still listed after 60 seconds.`,
        fix: "Check emulator state, then retry close.",
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for emulator shutdown
    await sleep(500);
  }
};

// Without an agent-device session, `close --shutdown` leaves the emulator
// running, so adb stops it.
const shutdownAndroid = async (id: string) => {
  try {
    await agentDevice(["close", ...getDeviceArgs("android", id), "--shutdown"]);
  } catch (error) {
    const isMissingSession =
      error instanceof CliError &&
      ["session_not_found", "no_open_session"].includes(error.status);
    if (!isMissingSession) {
      throw error;
    }
    try {
      execFileSync(getAdb(), ["-s", id, "emu", "kill"]);
    } catch (killError) {
      throw new CliError({
        status: "emulator_shutdown_failed",
        message: "Could not shut down Android emulator",
        why: killError instanceof Error ? killError.message : String(killError),
        fix: "Check emulator state, then retry close.",
      });
    }
  }
};

const closeAndroid = async (device: Device) => {
  clearAndroidData(device.id);
  await shutdownAndroid(device.id);
  await waitForAndroidShutdown(device.id);
};

const isSimulatorIn = (id: string, state: "Booted" | "Shutdown") =>
  execFileSync("xcrun", ["simctl", "list", "devices"], { encoding: "utf-8" })
    .split("\n")
    .some((line) => line.includes(id) && line.includes(`(${state})`));

const shutdownIos = async (id: string) => {
  await ignoreMissingSession([
    "close",
    ...getDeviceArgs("ios", id),
    "--shutdown",
  ]);
  if (isSimulatorIn(id, "Booted")) {
    execFileSync("xcrun", ["simctl", "shutdown", id]);
  }
  const deadline = Date.now() + 30_000;
  while (!isSimulatorIn(id, "Shutdown")) {
    if (Date.now() >= deadline) {
      throw new CliError({
        status: "simulator_shutdown_timeout",
        message: "iOS simulator did not shut down",
        why: `Simulator ${id} was still running after 30 seconds.`,
        fix: "Check simulator state, then retry close.",
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for simulator shutdown
    await sleep(500);
  }
};

const closeIos = async (device: Device) => {
  try {
    await shutdownIos(device.id);
    execFileSync("xcrun", ["simctl", "erase", device.id]);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      status: "simulator_erase_failed",
      message: "iOS simulator could not be erased",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check simulator state with `xcrun simctl list devices`, then retry.",
    });
  }
};

/** Shut down a simulator or emulator and end its agent-device session. Keeps app data. */
export const shutdownDevice = async (device: Device) => {
  if (device.platform === "android") {
    await shutdownAndroid(device.id);
    await waitForAndroidShutdown(device.id);
    return;
  }
  try {
    await shutdownIos(device.id);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      status: "simulator_shutdown_failed",
      message: "iOS simulator could not be shut down",
      why: error instanceof Error ? error.message : String(error),
      fix: "Run `bun app close --platform=ios`.",
    });
  }
};

const close = async (platform: Platform, selected?: Device) => {
  if (selected?.kind === "phone") {
    await closePhone(selected);
    return;
  }
  const device = selected ?? findDevice(platform);
  if (device) {
    await (platform === "android" ? closeAndroid(device) : closeIos(device));
  }
  await pruneBuilds();
  note("Closed device session");
};

/** Open the preview app on the selected platform or phone target. */
export const openFor = async (values: Record<string, string | undefined>) => {
  const device = await resolveDevice({
    platform: values.platform,
    target: values.target,
  });
  return open(device);
};

/** Seed the preview app on the selected platform or phone target. */
export const seedFor = async (values: Record<string, string | undefined>) => {
  const device = await resolveDevice({
    platform: values.platform,
    target: values.target,
  });
  return seed(device, values.fixture ?? "");
};

/** Close the preview app on the selected platform or phone target. */
export const closeFor = async (values: Record<string, string | undefined>) => {
  if (!values.target) {
    return close(platformFor(values));
  }
  const device = await resolveDevice({ target: values.target });
  return close(device.platform, device);
};
