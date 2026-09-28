import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import fs from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS } from "../../app.config.ts";
import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import { installBuild } from "./app-install.ts";
import { shutdownDevice } from "./app-session.ts";
import { pruneCheckouts } from "./builds.ts";
import {
  assertFlowsSupported,
  findFixture,
  listFlows,
} from "./flow-support.ts";
import { prepareIosRunner } from "./app.ts";
import {
  AGENT_DEVICE,
  agentDevice,
  getAgentDeviceEnv,
  stopStaleDaemon,
} from "./agent-device.ts";
import { deviceFlag, isDeviceBooted, resolveDevice } from "./device.ts";
import { getAdb, listPackagesArgs, listsPackage } from "./adb.ts";
import { DEVICE_ERRORS, DEVICE_OPTIONS } from "./options.ts";
import {
  clearPhoneAppData,
  isPhoneAppInstalled,
  openIosPhoneLink,
  preflightPhone,
  stopPhoneApp,
  uninstallPhoneApp,
} from "./phone.ts";
import {
  CliError,
  defineCommand,
  getStateDir,
  note,
  tryRun,
  withLogsOnStderr,
} from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";
import type { Device } from "./device.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const createRedactingWriter = (
  team: string | undefined,
  write: (text: string) => void
) => {
  let pending = "";
  return {
    push(chunk: string) {
      const text = pending + chunk;
      if (!team) {
        write(text);
        return;
      }
      const safeLength = Math.max(0, text.length - team.length + 1);
      let writeLength = safeLength;
      for (let length = 1; length < team.length; length += 1) {
        if (text.slice(0, safeLength).endsWith(team.slice(0, length))) {
          writeLength = safeLength - length;
          break;
        }
      }
      write(text.slice(0, writeLength).replaceAll(team, "<team>"));
      pending = text.slice(writeLength);
    },
    flush() {
      write(team ? pending.replaceAll(team, "<team>") : pending);
      pending = "";
    },
  };
};
const DEFAULT_PATHS: Record<Platform, string[]> = {
  android: ["e2e/flows"],
  ios: ["e2e/flows"],
};

const resetPhonePreview = (device: Device) => {
  if (isPhoneAppInstalled(device, APP_VARIANTS.preview.appId)) {
    stopPhoneApp(device, APP_VARIANTS.preview.appId, APP_VARIANTS.preview.name);
    if (device.platform === "ios") {
      uninstallPhoneApp(device, APP_VARIANTS.preview.appId);
    } else {
      clearPhoneAppData(device, APP_VARIANTS.preview.appId);
    }
  }
};

const resetIosSimulatorPreview = (deviceId: string) => {
  const apps = execFileSync("xcrun", ["simctl", "listapps", deviceId], {
    encoding: "utf-8",
  });
  const json = execFileSync("plutil", ["-convert", "json", "-o", "-", "-"], {
    encoding: "utf-8",
    input: apps,
  });
  // SAFETY: simctl listapps returns a property list keyed by bundle ID.
  const installed = JSON.parse(json) as Record<
    string,
    { CFBundleIdentifier?: string }
  >;
  if (Object.hasOwn(installed, APP_VARIANTS.preview.appId)) {
    execFileSync("xcrun", [
      "simctl",
      "uninstall",
      deviceId,
      APP_VARIANTS.preview.appId,
    ]);
  }
};

const resetAndroidEmulatorPreview = (deviceId: string) => {
  const packages = execFileSync(
    getAdb(),
    listPackagesArgs(deviceId, APP_VARIANTS.preview.appId),
    { encoding: "utf-8" }
  );
  if (listsPackage(packages, APP_VARIANTS.preview.appId)) {
    execFileSync(getAdb(), [
      "-s",
      deviceId,
      "uninstall",
      APP_VARIANTS.preview.appId,
    ]);
  }
};

const resetPreview = (device: Device) => {
  if (device.kind === "phone") {
    resetPhonePreview(device);
  } else if (device.platform === "ios") {
    resetIosSimulatorPreview(device.id);
  } else {
    resetAndroidEmulatorPreview(device.id);
  }
};

const resetBeforeRun = (device: Device) => {
  try {
    resetPreview(device);
  } catch (error) {
    // Phone errors already carry their own status and fix.
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      status: "app_reset_failed",
      message: "Could not reset preview app before E2E run",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check device state, then retry E2E run.",
    });
  }
};

const preparePhoneRunner = async (device: Device) => {
  if (device.kind === "phone" && device.platform === "ios") {
    await prepareIosRunner(device);
  }
};

interface RunOptions {
  artifactsDir: string;
  isVideo: boolean;
}

const runTest = async (
  device: Device,
  paths: string[],
  { artifactsDir, isVideo }: RunOptions,
  junitName: string
) => {
  const { platform } = device;
  const args = [
    "test",
    ...paths,
    "--maestro",
    "--platform",
    platform,
    deviceFlag(platform),
    device.id,
    "--artifacts-dir",
    artifactsDir,
    ...(isVideo ? ["--record-video"] : []),
    "--reporter",
    "default",
    "--reporter",
    `junit:${path.join(artifactsDir, junitName)}`,
    "--env",
    `APP_ID=${APP_VARIANTS.preview.appId}`,
    "--env",
    `APP_SCHEME=${APP_VARIANTS.preview.scheme}`,
  ];
  const child = spawn(AGENT_DEVICE, args, {
    cwd: REPO_ROOT,
    env: getAgentDeviceEnv(),
    stdio: ["inherit", "pipe", "pipe"],
  });
  let output = "";
  const signingTeam = getAgentDeviceEnv().AGENT_DEVICE_IOS_TEAM_ID?.trim();
  const stdoutWriter = createRedactingWriter(signingTeam, (text) => {
    output += text;
    process.stdout.write(text);
  });
  const stderrWriter = createRedactingWriter(signingTeam, (text) => {
    output += text;
    process.stderr.write(text);
  });
  child.stdout.on("data", (chunk: Buffer) => {
    stdoutWriter.push(chunk.toString());
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderrWriter.push(chunk.toString());
  });
  let code: number | null;
  try {
    // SAFETY: ChildProcess close passes exit code as its first value.
    [code] = (await once(child, "close")) as [number | null];
  } catch (error) {
    throw new CliError({
      status: "e2e_start_failed",
      message: "E2E runner could not start",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check agent-device installation, then retry.",
    });
  }
  stdoutWriter.flush();
  stderrWriter.flush();
  return { code, output };
};

const toRunError = (device: Device, code: number | null, output: string) => {
  const { platform } = device;
  if (
    output.includes("DEVICE_IN_USE") ||
    output.includes("is owned by session")
  ) {
    return new CliError({
      status: "device_in_use",
      message: "E2E device is in use",
      why: `agent-device holds ${device.key} for another run.`,
      fix: "Wait for the other run to finish, then retry.",
    });
  }
  if (
    device.kind === "phone" &&
    platform === "android" &&
    output.includes("test IME")
  ) {
    return new CliError({
      status: "android_phone_text_input_unsupported",
      message:
        "Flow needs text input that agent-device cannot do on an Android phone",
      why: "agent-device 0.21.15 erases text and types non-ASCII text on Android phones only in sessions opened with --test-ime. Flow runs cannot set it (https://github.com/callstack/agent-device/issues/2997).",
      fix: "Run this flow on the emulator: bun e2e run --platform=android --paths=<same paths>. Flows without eraseText run on the phone.",
    });
  }
  if (
    device.kind === "phone" &&
    platform === "ios" &&
    output.includes("only supported on iOS simulators")
  ) {
    return new CliError({
      status: "iphone_flow_step_unsupported",
      message: "Flow has a step that agent-device cannot do on an iPhone",
      why: "agent-device 0.21.14 runs launchApp with clearState or permissions on iOS simulators only.",
      fix: "Run this flow on the simulator: bun e2e run --platform=ios --paths=<same paths>. Flows without clearState and permissions run on the iPhone.",
    });
  }
  return new CliError({
    status: "e2e_failed",
    message: "E2E flow failed",
    why: `agent-device test exited with ${code}.`,
    fix: "Read the failed flow and artifacts in the checkout state directory, then retry.",
  });
};

// Storage writes of a loaded fixture finish within this time.
const FIXTURE_SETTLE_MS = 5000;

// agent-device cannot open links on iPhones, so each flow runs alone, after
// devicectl loaded its fixture.
const runIosPhoneFlows = async (
  device: Device,
  paths: string[],
  options: RunOptions
) => {
  const { artifactsDir } = options;
  const flows = listFlows(REPO_ROOT, paths);
  const failed: string[] = [];
  for (const flow of flows) {
    const fixtureId = findFixture(REPO_ROOT, flow);
    if (fixtureId) {
      if (!FIXTURES.some((fixture) => fixture.id === fixtureId)) {
        throw new CliError({
          exitCode: 2,
          status: "fixture_not_found",
          message: `Unknown fixture "${fixtureId}" in ${flow}`,
          why: "No fixture in src/dev/fixtures has this ID.",
          fix: `Use one of: ${FIXTURES.map((fixture) => fixture.id).join(", ")}.`,
        });
      }
      note(`Seeding fixture ${fixtureId} for ${flow}`);
      openIosPhoneLink(
        device,
        APP_VARIANTS.preview.appId,
        `${APP_VARIANTS.preview.scheme}://dev/fixture?id=${fixtureId}`,
        { terminateExisting: true }
      );
      // oxlint-disable-next-line no-await-in-loop -- flows run one at a time on one phone
      await sleep(FIXTURE_SETTLE_MS);
    }
    const name = path.basename(flow).replace(/\.ya?ml$/u, "");
    // oxlint-disable-next-line no-await-in-loop -- flows run one at a time on one phone
    const { code, output } = await runTest(
      device,
      [flow],
      options,
      `junit-${name}.xml`
    );
    if (code !== 0) {
      const error = toRunError(device, code, output);
      if (error.status !== "e2e_failed") {
        throw error;
      }
      failed.push(flow);
    }
  }
  if (failed.length) {
    throw new CliError({
      status: "e2e_failed",
      message: `${failed.length} of ${flows.length} flows failed`,
      why: `Failed: ${failed.join(", ")}.`,
      fix: `Read artifacts in ${artifactsDir}, then retry: bun e2e run --target=${device.key} --paths=${failed.join(",")}.`,
    });
  }
};

/** Print recordings of this run, oldest first. */
const printVideos = (artifactsDir: string, since: number) => {
  const videos = fs
    .readdirSync(artifactsDir, { recursive: true, encoding: "utf-8" })
    .filter((file) => path.basename(file) === "recording.mp4")
    .map((file) => path.join(artifactsDir, file))
    .filter((file) => fs.statSync(file).mtimeMs >= since)
    .toSorted((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  if (videos.length) {
    console.log(`Videos:\n${videos.map((file) => `  ${file}`).join("\n")}`);
  }
};

const run = async (device: Device, paths: string[], isVideo: boolean) => {
  const { platform } = device;
  const selectedPaths = paths.length ? paths : DEFAULT_PATHS[platform];
  if (device.kind === "phone") {
    assertFlowsSupported(REPO_ROOT, device, selectedPaths);
    await preflightPhone(device);
  }
  const selector = ["--platform", platform, deviceFlag(platform), device.id];
  try {
    await agentDevice(["close", ...selector]);
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
  resetBeforeRun(device);
  await installBuild(device);
  await stopStaleDaemon();
  await preparePhoneRunner(device);
  const artifactsDir = path.join(getStateDir("e2e"), device.key);
  fs.mkdirSync(artifactsDir, { recursive: true });
  note(`Running agent-device test on ${device.name}`);
  const options = { artifactsDir, isVideo };
  const startedAt = Date.now();
  try {
    if (device.kind === "phone" && platform === "ios") {
      await runIosPhoneFlows(device, selectedPaths, options);
      return;
    }
    const { code, output } = await runTest(
      device,
      selectedPaths,
      options,
      "junit.xml"
    );
    if (code !== 0) {
      throw toRunError(device, code, output);
    }
  } finally {
    if (isVideo) {
      printVideos(artifactsDir, startedAt);
    }
  }
};

// Cleanup failures must not hide the run result.
const warnOnFailure = async (work: () => Promise<void>) => {
  try {
    await work();
  } catch (error) {
    if (!(error instanceof CliError)) {
      throw error;
    }
    note(
      `warning [${error.status}]: ${error.message}\n  why: ${error.why}\n  fix: ${error.fix}`
    );
  }
};

// Ctrl-C skips `finally`, so shut down without waiting before exit.
const shutdownNow = (device: Device) => {
  if (device.platform === "ios") {
    tryRun("xcrun", ["simctl", "shutdown", device.id]);
  } else {
    tryRun(getAdb(), ["-s", device.id, "emu", "kill"]);
  }
};

// Shut down a simulator or emulator this run booted; leave running ones alone.
const runAndShutdown = async (
  values: { platform?: string; target?: string },
  paths: string[],
  isVideo: boolean
) => {
  await warnOnFailure(() => withLogsOnStderr(pruneCheckouts));
  const { platform } = values;
  const wasBooted =
    platform === "ios" || platform === "android"
      ? isDeviceBooted(platform)
      : true;
  const device = await resolveDevice(values);
  if (wasBooted) {
    return run(device, paths, isVideo);
  }
  const onSignal = (signal: NodeJS.Signals) => {
    shutdownNow(device);
    process.removeListener(signal, onSignal);
    process.kill(process.pid, signal);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  try {
    await run(device, paths, isVideo);
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    note(`Shutting down ${device.name}`);
    await warnOnFailure(() => shutdownDevice(device));
  }
};

const E2E: Noun = {
  commands: {
    run: defineCommand({
      options: {
        ...DEVICE_OPTIONS,
        paths: {
          value: "<path,...>",
          description: [
            "Optional. Flow files or folders, comma-separated, relative to repository root.",
            "Default: e2e/flows.",
          ],
        },
        video: {
          description: [
            "Optional. Record each flow attempt to recording.mp4 in its artifacts folder.",
          ],
        },
      },
      exactlyOne: ["platform", "target"],
      successWord: "pass",
      sections: [
        {
          title: "Behavior",
          lines: [
            "Removes the preview app and its data, installs the current build, then runs flows.",
            "Builds first when cache has no match.",
            "Shuts down the simulator or emulator after the run if the run booted it.",
            "Deletes simulators and run files of deleted checkouts first.",
          ],
        },
        {
          title: "Output",
          lines: [
            "Flow results on stdout.",
            "Artifacts folder includes junit.xml.",
            "iPhone: one junit-<flow>.xml per flow.",
            "--video: video paths on stdout after the run, also when flows fail.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun e2e run --platform=ios",
            "bun e2e run --target=pixel-8-09yw --paths=e2e/flows/entry-full.yaml",
            "bun e2e run --platform=ios --paths=e2e/flows/first-launch.yaml,e2e/flows/entry-cancel.yaml",
            "bun e2e run --platform=android --paths=e2e/flows/tags.yaml --video",
          ],
        },
      ],
      errors: {
        ...DEVICE_ERRORS,
        path_not_found: "One --paths entry does not exist",
        flows_unsupported_on_phone:
          "Selected flows use steps agent-device cannot run on this phone",
        app_reset_failed: "Preview app was not removed before the run",
        ios_runner_not_ready: "agent-device runner did not start on iPhone",
        e2e_failed: "One or more flows failed, read artifacts",
      },
      run: (values) => {
        const paths =
          values.paths === undefined
            ? []
            : values.paths.split(",").map((item) => item.trim());
        if (paths.some((item) => !item)) {
          throw new CliError({
            exitCode: 2,
            status: "invalid_value",
            message: `Invalid value "${values.paths}" for --paths`,
            why: "--paths accepts a comma-separated list of paths.",
            fix: "Pass non-empty paths separated by commas.",
          });
        }
        for (const item of paths) {
          if (!fs.existsSync(path.resolve(REPO_ROOT, item))) {
            throw new CliError({
              exitCode: 2,
              status: "path_not_found",
              message: `Path not found "${item}"`,
              why: `--paths entry ${item} does not exist relative to repository root.`,
              fix: "Pass an existing file or folder relative to repository root.",
            });
          }
        }
        return runAndShutdown(values, paths, values.video === "true");
      },
      summary:
        "Reinstall the preview app, then run Maestro flows on one device.",
    }),
  },
  summary: "Run Maestro flows on the preview app.",
  helpTail: ["Run `bun e2e <command> --help` for details."],
};

export { E2E };
