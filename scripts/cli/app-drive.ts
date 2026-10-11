// Run agent-device on this checkout's device, so callers never copy UDIDs,
// session names, or signing environment by hand.
import path from "node:path";

import {
  AGENT_DEVICE,
  ensureDaemonSigningEnv,
  getAgentDeviceEnv,
  STATE_DIR,
  stopStaleDaemon,
} from "./agent-device.ts";
import { deviceFlag, findDevice } from "./device.ts";
import { getPlatform } from "./options.ts";
import { findConnectedPhone } from "./phone.ts";
import { assertNotReserved } from "./reservation.ts";
import { CliError } from "./shared.ts";
import type { Platform } from "./shared.ts";
import { toToken } from "./target.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");

// The CLI sets these. Passing them again selects a second device or session.
const OWNED_FLAGS = [
  "--platform",
  "--udid",
  "--serial",
  "--device",
  "--session",
  "--state-dir",
];

/** Device that agent-device commands run on. Phones get their own session. */
export interface DriveDevice {
  platform: Platform;
  id: string;
  session?: string;
}

/** Fail before any device access when args are empty or select a device. */
const checkDriveArgs = (args: string[]) => {
  if (args.length === 0) {
    throw new CliError({
      exitCode: 2,
      status: "missing_argument",
      message: "No agent-device command passed",
      why: "bun app drive runs the agent-device command after `--`.",
      fix: "Pass one, for example: bun app drive --platform=ios -- snapshot -i",
    });
  }
  const owned = args.find((arg) =>
    OWNED_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`))
  );
  if (owned) {
    throw new CliError({
      exitCode: 2,
      status: "conflicting_options",
      message: `agent-device option ${owned.split("=")[0]} passed`,
      why: `bun app drive sets ${OWNED_FLAGS.join(", ")} from --platform or --target.`,
      fix: `Remove ${owned.split("=")[0]} after \`--\`. Pick the device with --platform or --target.`,
    });
  }
};

/** Build the agent-device argv and env for one device. Pure: no device access. */
export const buildDriveCommand = ({
  device,
  args,
  env,
}: {
  device: DriveDevice;
  args: string[];
  env: NodeJS.ProcessEnv;
}) => {
  checkDriveArgs(args);
  return {
    argv: [
      AGENT_DEVICE,
      ...args,
      "--platform",
      device.platform,
      deviceFlag(device.platform),
      device.id,
      ...(device.session ? ["--session", device.session] : []),
    ],
    env: { AGENT_DEVICE_STATE_DIR: STATE_DIR, ...env },
  };
};

const resolveDriveDevice = async (
  values: Record<string, string | undefined>
): Promise<DriveDevice> => {
  if (values.target) {
    const phone = await findConnectedPhone(values.target);
    assertNotReserved(phone.id);
    if (phone.platform === "ios") {
      await ensureDaemonSigningEnv();
    }
    return {
      platform: phone.platform,
      id: phone.id,
      session: toToken(phone.name, phone.id),
    };
  }
  // SAFETY: parser accepts only ios or android, and exactlyOne requires one option.
  const platform = getPlatform(values.platform) as Platform;
  const device = findDevice(platform);
  if (!device) {
    throw new CliError({
      status: "device_not_running",
      message: `This checkout has no ${platform === "ios" ? "simulator" : "running emulator"}`,
      why: `bun app drive does not create or boot devices.`,
      fix: `Run \`bun app open --platform=${platform}\` first.`,
    });
  }
  return { platform, id: device.id };
};

/** Run agent-device with `rest` unchanged on the selected device. Exit code is agent-device's. */
export const driveFor = async (
  values: Record<string, string | undefined>,
  rest: string[]
) => {
  checkDriveArgs(rest);
  const device = await resolveDriveDevice(values);
  const { argv, env } = buildDriveCommand({
    device,
    args: rest,
    env: getAgentDeviceEnv(),
  });
  await stopStaleDaemon();
  const child = Bun.spawn(argv, {
    cwd: REPO_ROOT,
    env,
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exitCode = await child.exited;
};
