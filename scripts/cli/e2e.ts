import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";

import { APP_VARIANTS } from "../../app.config.ts";
import {
  AGENT_DEVICE,
  getAgentDeviceEnv,
  stopStaleDaemon,
} from "./agent-device.ts";
import { deviceFlag, ensureDevice } from "./device.ts";
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
    if (output.includes("DEVICE_IN_USE")) {
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
