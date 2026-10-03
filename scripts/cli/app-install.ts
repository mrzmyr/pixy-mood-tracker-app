import { execFileSync } from "node:child_process";
import path from "node:path";

import { buildIosPhone } from "./ios-phone-build.ts";
import { getAdb } from "./adb.ts";
import { getBuildCacheDir, getCachedBuild } from "./app-build.ts";
import type { BuildVariant } from "./app-build.ts";
import type { Device } from "./device.ts";
import { resolveDevice } from "./device.ts";
import { preflightPhone, installPhoneApp } from "./phone.ts";
import { CliError, note } from "./shared.ts";

/** Install one app file on a simulator or emulator. */
export const installFile = (
  device: Device,
  file: string,
  label: BuildVariant
) => {
  const { platform } = device;
  const command = platform === "ios" ? "xcrun" : getAdb();
  const args =
    platform === "ios"
      ? ["simctl", "install", device.id, file]
      : ["-s", device.id, "install", "-r", file];
  try {
    execFileSync(command, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr =
      error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    throw new CliError({
      status: "install_failed",
      message: `Could not install ${label} build on ${device.name}`,
      why:
        stderr.trim().split("\n")[0] ||
        (error instanceof Error ? error.message : String(error)),
      fix: "Check device state and cached build, then retry install.",
    });
  }
  note(`Installed on ${device.name}`);
};

/** Install the exact cached preview build on this checkout's device. */
export const installBuild = async (device: Device) => {
  const { platform } = device;
  let file: string | null;
  let key: string;
  if (device.kind === "phone" && platform === "ios") {
    key = await buildIosPhone(device);
    file = path.join(getBuildCacheDir(), `${key}.app`);
  } else {
    const cache = await getCachedBuild(platform);
    ({ key, file } = cache);
  }
  if (!file) {
    throw new CliError({
      status: "build_cache_missing",
      message: "Cached preview build could not be resolved",
      why: `No build for ${key} after ensureBuild.`,
      fix: "Check build cache state, then retry install.",
    });
  }
  if (device.kind === "phone") {
    preflightPhone(device);
    installPhoneApp(device, file);
    note(`Installed on ${device.key}`);
    return;
  }
  installFile(device, file, "preview");
};

/** Install the preview build on the selected platform or phone target. */
export const installFor = async (
  values: Record<string, string | undefined>
) => {
  const device = await resolveDevice({
    platform: values.platform,
    target: values.target,
  });
  await installBuild(device);
};
