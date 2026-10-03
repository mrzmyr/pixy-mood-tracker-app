// `bun app dev`: install the cached dev client, start this checkout's Metro,
// and open the app on it. The dev client (development variant) loads
// JavaScript from Metro, so edits reload without a native build. Its cache
// key is the native fingerprint only: every worktree with the same native
// dependencies reuses one binary from the shared build cache.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS } from "../../app.config.ts";
import { getAdb } from "./adb.ts";
import { getCachedBuild } from "./app-build.ts";
import { installFile } from "./app-install.ts";
import { toBuildId } from "./builds.ts";
import { resolveDevice } from "./device.ts";
import type { Device } from "./device.ts";
import { startMetro } from "./metro.ts";
import type { Metro } from "./metro.ts";
import { getPlatform } from "./options.ts";
import { CliError, getStateDir, note } from "./shared.ts";
import type { Platform } from "./shared.ts";

const DEV = APP_VARIANTS.development;
const BUNDLE_TIMEOUT_MS = 180_000;

const run = (command: string, args: string[]) =>
  execFileSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

// execFileSync errors carry the child's stderr; its first line names the cause.
const describeError = (error: Error) => {
  const stderr = "stderr" in error ? String(error.stderr) : "";
  return stderr.trim().split("\n")[0] || error.message;
};

// Deep link that makes the dev client load from this checkout's Metro.
const devClientUrl = (metro: Metro) =>
  `${DEV.scheme}://expo-development-client/?url=${encodeURIComponent(metro.url)}`;

// iOS asks "Open in Pixy Dev?" before a link launches the app. Expo CLI
// pre-approves the scheme in the simulator's Launch Services plist. Same here,
// so the link opens the app without a tap.
const approveIosScheme = (udid: string) => {
  const plist = path.join(
    os.homedir(),
    "Library/Developer/CoreSimulator/Devices",
    udid,
    "data/Library/Preferences/com.apple.launchservices.schemeapproval.plist"
  );
  const json = `${plist}.${process.pid}.json`;
  try {
    // SAFETY: plutil -convert json returns a string-to-string dictionary.
    const approvals = fs.existsSync(plist)
      ? (JSON.parse(
          run("plutil", ["-convert", "json", "-o", "-", plist])
        ) as Record<string, string>)
      : {};
    approvals[`com.apple.CoreSimulator.CoreSimulatorBridge-->${DEV.scheme}`] =
      DEV.appId;
    fs.mkdirSync(path.dirname(plist), { recursive: true });
    fs.writeFileSync(json, JSON.stringify(approvals));
    run("plutil", ["-convert", "binary1", "-o", plist, json]);
  } catch (error) {
    note(
      `note: could not pre-approve ${DEV.scheme} links: ${error instanceof Error ? describeError(error) : String(error)}. Tap "Open" in the simulator.`
    );
  } finally {
    fs.rmSync(json, { force: true });
  }
};

const openDevClient = (device: Device, metro: Metro) => {
  const url = devClientUrl(metro);
  try {
    if (device.platform === "ios") {
      approveIosScheme(device.id);
      run("xcrun", ["simctl", "openurl", device.id, url]);
    } else {
      const adb = getAdb();
      // The emulator reaches the Mac's localhost through adb reverse.
      run(adb, [
        "-s",
        device.id,
        "reverse",
        `tcp:${metro.port}`,
        `tcp:${metro.port}`,
      ]);
      run(adb, [
        "-s",
        device.id,
        "shell",
        `am start -a android.intent.action.VIEW -d '${url}' ${DEV.appId}`,
      ]);
    }
  } catch (error) {
    throw new CliError({
      status: "dev_client_open_failed",
      message: `Could not open the dev client on ${device.name}`,
      why: error instanceof Error ? describeError(error) : String(error),
      fix: `Check that ${DEV.appId} is installed (\`bun app dev\` installs it), then retry.`,
    });
  }
  return url;
};

const screenshot = (device: Device) => {
  const dir = path.join(getStateDir("screenshots"), device.key);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "dev.png");
  if (device.platform === "ios") {
    run("xcrun", ["simctl", "io", device.id, "screenshot", file]);
  } else {
    fs.writeFileSync(
      file,
      execFileSync(getAdb(), ["-s", device.id, "exec-out", "screencap", "-p"], {
        stdio: ["ignore", "pipe", "pipe"],
      })
    );
  }
  return file;
};

// Metro logs `iOS Bundled 1234ms ...` once the dev client loaded the app, or
// `Bundling failed` when the code does not compile.
const waitForBundle = async (
  platform: Platform,
  metro: Metro,
  logOffset: number,
  takeScreenshot: () => string
) => {
  const label = platform === "ios" ? "iOS" : "Android";
  const bundled = new RegExp(`^${label} Bundled `, "mu");
  const failed = new RegExp(`^${label} Bundling failed`, "mu");
  const deadline = Date.now() + BUNDLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // Byte offset: the log holds multi-byte characters, so string slicing drifts.
    const output = fs.readFileSync(metro.log).subarray(logOffset).toString();
    if (bundled.test(output)) {
      return;
    }
    if (failed.test(output)) {
      throw new CliError({
        status: "bundle_failed",
        message: "Metro could not bundle the app",
        why: `Metro reported "${label} Bundling failed". Screenshot: ${takeScreenshot()}.`,
        fix: `Read ${metro.log}, fix the error, then rerun \`bun app dev\`.`,
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling Metro's log
    await sleep(1000);
  }
  throw new CliError({
    status: "bundle_timeout",
    message: "Dev client did not load the app",
    why: `Metro logged no "${label} Bundled" line within ${BUNDLE_TIMEOUT_MS / 1000} seconds. Screenshot: ${takeScreenshot()}.`,
    fix: `Inspect the screenshot and ${metro.log}, then rerun \`bun app dev\`.`,
  });
};

const dev = async (platform: Platform) => {
  const device = await resolveDevice({ platform });
  const build = await getCachedBuild(platform, "development");
  if (!build.file) {
    throw new CliError({
      status: "build_cache_missing",
      message: "Cached dev client could not be resolved",
      why: `No build for ${build.key} after ensureBuild.`,
      fix: "Run `bun builds list`, check the build cache, then retry.",
    });
  }
  note(`Dev client ${toBuildId(build.key)}`);
  installFile(device, build.file, "development");
  const metro = await startMetro();
  const logOffset = fs.statSync(metro.log).size;
  const url = openDevClient(device, metro);
  note(`Opened ${url}`);
  await waitForBundle(platform, metro, logOffset, () => screenshot(device));
  // The splash screen stays up until the first screen has rendered.
  await sleep(3000);
  note(
    `Edits reload in the app. Rerun \`bun app dev --platform=${platform}\` to reload by hand. Metro log: ${metro.log}`
  );
  console.log(screenshot(device));
};

/** Run the dev client with Metro on this checkout's simulator or emulator. */
export const devFor = async (values: Record<string, string | undefined>) => {
  const platform = getPlatform(values.platform);
  if (!platform) {
    throw new CliError({
      exitCode: 2,
      status: "missing_option",
      message: "Missing --platform",
      why: "bun app dev needs a simulator or emulator.",
      fix: "Pass --platform=ios or --platform=android.",
    });
  }
  await dev(platform);
};
