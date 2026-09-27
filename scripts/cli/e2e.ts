import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

import { APP_VARIANTS } from "../../app.config.ts";
import { installBuild } from "./app.ts";
import {
  AGENT_DEVICE,
  agentDevice,
  getAgentDeviceEnv,
  stopStaleDaemon,
} from "./agent-device.ts";
import { deviceFlag, ensureDevice, getAdb } from "./device.ts";
import { CliError, defineCommand, getStateDir, note } from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const DEFAULT_PATHS: Record<Platform, string[]> = {
  android: ["e2e/flows"],
  ios: ["e2e/flows"],
};

const getPlatform = (value: string | undefined): Platform => {
  if (value === "ios" || value === "android") {
    return value;
  }
  throw new CliError({
    exitCode: 2,
    status: "invalid_platform",
    message: `Unknown platform "${value ?? ""}"`,
    why: "E2E runs accept ios or android as the first argument.",
    fix: "Pass ios or android after run.",
  });
};

interface Device {
  id: string;
  name: string;
}

const closeSession = async (platform: Platform, device: Device) => {
  try {
    await agentDevice([
      "close",
      "--platform",
      platform,
      deviceFlag(platform),
      device.id,
    ]);
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

// Uninstalls the preview app, which also deletes its data.
const resetApp = (platform: Platform, device: Device) => {
  try {
    if (platform === "ios") {
      const apps = execFileSync("xcrun", ["simctl", "listapps", device.id], {
        encoding: "utf-8",
      });
      const json = execFileSync(
        "plutil",
        ["-convert", "json", "-o", "-", "-"],
        {
          encoding: "utf-8",
          input: apps,
        }
      );
      // SAFETY: simctl listapps returns a property list keyed by bundle ID.
      const installed = JSON.parse(json) as Record<
        string,
        { CFBundleIdentifier?: string }
      >;
      if (Object.hasOwn(installed, APP_VARIANTS.preview.appId)) {
        execFileSync("xcrun", [
          "simctl",
          "uninstall",
          device.id,
          APP_VARIANTS.preview.appId,
        ]);
      }
    } else {
      const installed = execFileSync(
        getAdb(),
        ["-s", device.id, "shell", "pm", "path", APP_VARIANTS.preview.appId],
        { encoding: "utf-8" }
      );
      if (installed.trim()) {
        execFileSync(getAdb(), [
          "-s",
          device.id,
          "uninstall",
          APP_VARIANTS.preview.appId,
        ]);
      }
    }
  } catch (error) {
    throw new CliError({
      status: "app_reset_failed",
      message: "Could not reset preview app before E2E run",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check device state, then retry E2E run.",
    });
  }
};

const runFlows = async (
  platform: Platform,
  device: Device,
  paths: string[]
) => {
  await stopStaleDaemon();
  const artifactsDir = getStateDir("e2e");
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
    "--reporter",
    "default",
    "--reporter",
    `junit:${path.join(artifactsDir, "junit.xml")}`,
    "--env",
    `APP_ID=${APP_VARIANTS.preview.appId}`,
    "--env",
    `APP_SCHEME=${APP_VARIANTS.preview.scheme}`,
  ];
  note(`Running agent-device test on ${device.name}`);
  const child = spawn(AGENT_DEVICE, args, {
    cwd: REPO_ROOT,
    env: getAgentDeviceEnv(),
    stdio: ["inherit", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    output += text;
    process.stderr.write(text);
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
  if (code !== 0) {
    if (
      output.includes("DEVICE_IN_USE") ||
      output.includes("is owned by session")
    ) {
      throw new CliError({
        status: "DEVICE_IN_USE",
        message: "E2E device is in use",
        why: `agent-device holds ${device.name} for another run.`,
        fix: "Wait for the other run to finish, then retry.",
      });
    }
    throw new CliError({
      status: "e2e_failed",
      message: "E2E flow failed",
      why: `agent-device test exited with ${code}.`,
      fix: "Read the failed flow and artifacts in the checkout state directory, then retry.",
    });
  }
};

const run = async (platform: Platform, paths: string[]) => {
  const device = await ensureDevice(platform);
  await closeSession(platform, device);
  resetApp(platform, device);
  await installBuild(platform, device);
  await runFlows(
    platform,
    device,
    paths.length ? paths : DEFAULT_PATHS[platform]
  );
};

// Copies an old simulator build and gives it the preview bundle ID, so the
// current preview build installs over it like a store update.
const prepareOldApp = (oldApp: string) => {
  const target = path.join(getStateDir("upgrade"), "old.app");
  try {
    execFileSync("rm", ["-rf", target]);
    execFileSync("cp", ["-R", oldApp, target]);
    // App extensions keep the old bundle ID prefix and block install.
    execFileSync("rm", ["-rf", path.join(target, "PlugIns")]);
    execFileSync("/usr/libexec/PlistBuddy", [
      "-c",
      `Set CFBundleIdentifier ${APP_VARIANTS.preview.appId}`,
      path.join(target, "Info.plist"),
    ]);
    execFileSync("codesign", ["-f", "-s", "-", "--deep", target], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new CliError({
      status: "old_app_prepare_failed",
      message: "Could not prepare old app build",
      why: error instanceof Error ? error.message : String(error),
      fix: "Pass a Release-iphonesimulator .app path, then retry.",
    });
  }
  return target;
};

const upgrade = async (
  platform: Platform,
  oldApp: string | undefined,
  seedFlow: string | undefined
) => {
  if (platform !== "ios" || !oldApp || !seedFlow) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_upgrade_args",
      message: "Upgrade test needs ios, an old .app, and a seed flow",
      why: "Only iOS simulators install old builds without store signing.",
      fix: "Run bun e2e upgrade ios <old.app> e2e/upgrade/seed-<version>.yaml.",
    });
  }
  const device = await ensureDevice(platform);
  await closeSession(platform, device);
  resetApp(platform, device);
  execFileSync("xcrun", [
    "simctl",
    "install",
    device.id,
    prepareOldApp(path.resolve(oldApp)),
  ]);
  note(`Installed old build on ${device.name}`);
  await runFlows(platform, device, [seedFlow]);
  await closeSession(platform, device);
  // simctl install over an installed app keeps its data, like a store update.
  await installBuild(platform, device);
  await runFlows(platform, device, ["e2e/upgrade/verify.yaml"]);
};

const E2E: Noun = {
  commands: {
    run: defineCommand({
      args: ["<ios|android>", "[paths...]"],
      run: ([platform, ...paths]) => run(getPlatform(platform), paths),
      summary: "Run Maestro flows on this checkout's device",
    }),
    upgrade: defineCommand({
      args: ["<ios>", "<old.app>", "<seed-flow>"],
      run: ([platform, oldApp, seedFlow]) =>
        upgrade(getPlatform(platform), oldApp, seedFlow),
      summary: "Seed an old build, install this build over it, verify data",
    }),
  },
  summary: "Run Maestro flows on the preview app.",
};

export { E2E };
