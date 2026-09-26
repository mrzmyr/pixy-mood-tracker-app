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
  const args = [
    "test",
    ...(paths.length ? paths : DEFAULT_PATHS[platform]),
    "--maestro",
    "--platform",
    platform,
    deviceFlag(platform),
    device.id,
    "--artifacts-dir",
    getStateDir("e2e"),
    "--reporter",
    "default",
    "--env",
    `APP_ID=${APP_VARIANTS.preview.appId}`,
    "--env",
    `APP_SCHEME=${APP_VARIANTS.preview.scheme}`,
  ];
  note(`Running agent-device test on ${device.name}`);
  const child = spawn(AGENT_DEVICE, args, {
    cwd: REPO_ROOT,
    env: getAgentDeviceEnv(),
    stdio: "inherit",
  });
  // SAFETY: ChildProcess exit passes exit code as its first value.
  const [code] = (await once(child, "exit")) as [number | null];
  if (code !== 0) {
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
