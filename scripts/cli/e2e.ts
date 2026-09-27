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
  ios: ["e2e/flows", "e2e/apple"],
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

const run = async (platform: Platform, paths: string[]) => {
  const device = await ensureDevice(platform);
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
  await installBuild(platform, device);
  await stopStaleDaemon();
  const artifactsDir = getStateDir("e2e");
  const args = [
    "test",
    ...(paths.length ? paths : DEFAULT_PATHS[platform]),
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

const E2E: Noun = {
  commands: {
    run: defineCommand({
      args: ["<ios|android>", "[paths...]"],
      run: ([platform, ...paths]) => run(getPlatform(platform), paths),
      summary: "Run Maestro flows on this checkout's device",
    }),
  },
  summary: "Run Maestro flows on the preview app.",
};

export { E2E };
