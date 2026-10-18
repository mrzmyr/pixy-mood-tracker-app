// Launch check for the release JS bundle without a native compile.
// Exports the JS with the env of one eas.json profile, puts it into a copy of
// a cached iOS Release simulator app, and watches the first seconds of launch.
// Catches crashes that only release bundles have, for example 1.99.0:
// tree shaking dropped chroma-js side effects (#880).
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { createFingerprintAsync } from "@expo/fingerprint";

import { installFile } from "./app-install.ts";
import { listBuilds, toBuildId } from "./builds.ts";
import { ensureDevice } from "./device.ts";
import type { Device } from "./device.ts";
import { assertHostReady } from "./disk.ts";
import { judgeIosLaunch } from "./launch-log.ts";
import { appendRunLog, setResultPath, step } from "./run-log.ts";
import {
  CliError,
  getStateDir,
  isProcessAlive,
  note,
  readJson,
} from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const EXPO = path.join(REPO_ROOT, "node_modules", ".bin", "expo");
/** Seconds to watch the app after launch. 1.99.0 crashed in under 2 seconds. */
export const WATCH_SECONDS = 15;
const EXPORT_TIMEOUT_MS = 15 * 60_000;

/** eas.json build profiles that ship a release bundle. First is the default. */
export const RELEASE_PROFILES = ["production", "preview"] as const;
type ReleaseProfile = (typeof RELEASE_PROFILES)[number];

interface EasProfile {
  extends?: string;
  env?: Record<string, string>;
}

/** Env of one eas.json build profile, `extends` chain included. */
const readProfileEnv = (profile: ReleaseProfile) => {
  const eas = readJson<{ build?: Record<string, EasProfile> }>(
    path.join(REPO_ROOT, "eas.json")
  );
  const env: Record<string, string> = {};
  const seen = new Set<string>();
  const apply = (name: string) => {
    const spec = eas?.build?.[name];
    if (!spec || seen.has(name)) {
      throw new CliError({
        status: "eas_profile_invalid",
        message: `Could not read eas.json build profile "${name}"`,
        why: spec
          ? `Profile "${name}" extends itself.`
          : `eas.json has no build profile "${name}".`,
        fix: "Fix eas.json, then retry.",
      });
    }
    seen.add(name);
    if (spec.extends) {
      apply(spec.extends);
    }
    Object.assign(env, spec.env);
  };
  apply(profile);
  return env;
};

/** Cached iOS Release simulator build. Prefers the current native fingerprint. */
const pickIosBuild = async () => {
  const builds = listBuilds()
    .filter(
      (build) =>
        build.platform === "ios" &&
        build.target === "simulator" &&
        build.isRelease &&
        build.file.endsWith(".app")
    )
    .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  if (builds.length === 0) {
    throw new CliError({
      status: "release_build_missing",
      message: "No cached iOS Release simulator build",
      why: "Smoke needs one Release build as native shell. `bun builds list` shows none with VARIANT Release for ios simulator.",
      fix: "Run `bun app build --platform=ios` once, then retry. Later JS changes reuse that build.",
    });
  }
  // Cached preview builds carry the preview fingerprint.
  const previous = process.env.EXPO_PUBLIC_APP_VARIANT;
  process.env.EXPO_PUBLIC_APP_VARIANT = "preview";
  const { hash } = await createFingerprintAsync(REPO_ROOT);
  process.env.EXPO_PUBLIC_APP_VARIANT = previous;
  const match = builds.find((build) => build.fingerprint === hash);
  const build = match ?? builds[0];
  note(`Native shell: ${toBuildId(build.key)}`);
  if (!match) {
    note(
      `warning [native_mismatch]: Native shell is from another native fingerprint\n  why: No cached Release build matches ${hash.slice(0, 8)}. JS that needs a new native module can crash in this shell.\n  fix: On a crash about a missing native module, run \`bun app build --platform=ios\`, then retry.`
    );
  }
  return { build, isNativeMatch: Boolean(match) };
};

// Streams child output into the run log. Fails with `status` on a non-zero exit.
const runLogged = async (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  status: string
) => {
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: EXPORT_TIMEOUT_MS,
  });
  let tail = "";
  const collect = (chunk: Buffer) => {
    appendRunLog(chunk);
    tail = `${tail}${chunk.toString()}`.slice(-2000);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  // SAFETY: ChildProcess close passes exit code as its first value.
  const [code] = (await once(child, "close")) as [number | null];
  if (code !== 0) {
    const lastLine = tail.trim().split("\n").at(-1) ?? "";
    throw new CliError({
      status,
      message: `\`${path.basename(command)} ${args[0]}\` failed`,
      why: `Process exited with ${code}. Last line: ${lastLine}`,
      fix: "Read the run log, fix the cause, then retry.",
    });
  }
};

/** Export the iOS release JS bundle with the env of the eas.json profile. */
const exportBundle = async (profile: ReleaseProfile, workDir: string) => {
  step("Export JS");
  const outDir = path.join(workDir, "export");
  // Fresh Metro cache: metro.config.js keys its cache on the app variant
  // only, so a shared cache can hide a bundler flag change.
  const tmpDir = path.join(workDir, "tmp");
  fs.mkdirSync(tmpDir);
  const profileEnv = readProfileEnv(profile);
  note(
    `Profile ${profile}: ${Object.entries(profileEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ")}`
  );
  await runLogged(
    EXPO,
    ["export", "--platform", "ios", "--no-bytecode", "--output-dir", outDir],
    { ...process.env, ...profileEnv, TMPDIR: tmpDir, CI: "1" },
    "export_failed"
  );
  const jsDir = path.join(outDir, "_expo", "static", "js", "ios");
  const bundles = fs.existsSync(jsDir)
    ? fs.readdirSync(jsDir).filter((file) => file.endsWith(".js"))
    : [];
  if (bundles.length !== 1) {
    throw new CliError({
      status: "export_bundle_missing",
      message: "Export did not produce one iOS JS bundle",
      why: `${jsDir} has ${bundles.length} .js files, expected 1.`,
      fix: "Read the run log for `expo export` output, then retry.",
    });
  }
  return {
    bundle: path.join(jsDir, bundles[0]),
    assets: path.join(outDir, "assets"),
  };
};

const plistValue = (app: string, key: string) =>
  execFileSync(
    "plutil",
    ["-extract", key, "raw", "-o", "-", path.join(app, "Info.plist")],
    { encoding: "utf-8" }
  ).trim();

/** Copy the native shell, swap in the exported JS, re-sign ad hoc. */
const patchApp = (
  shell: string,
  exported: { bundle: string; assets: string },
  workDir: string
) => {
  step("Patch app");
  const app = path.join(workDir, path.basename(shell));
  // APFS clone: instant, no extra disk until files change.
  execFileSync("cp", ["-cR", shell, app]);
  fs.copyFileSync(exported.bundle, path.join(app, "main.jsbundle"));
  if (fs.existsSync(exported.assets)) {
    fs.cpSync(exported.assets, path.join(app, "assets"), {
      recursive: true,
      force: true,
    });
  }
  try {
    execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new CliError({
      status: "codesign_failed",
      message: "Could not re-sign the patched app",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check `codesign` works (`xcode-select -p`), then retry.",
    });
  }
  return {
    app,
    bundleId: plistValue(app, "CFBundleIdentifier"),
    executable: plistValue(app, "CFBundleExecutable"),
  };
};

const simctl = (args: string[]) =>
  execFileSync("xcrun", ["simctl", ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  }).trim();

const uninstall = (device: Device, bundleId: string) => {
  try {
    simctl(["uninstall", device.id, bundleId]);
  } catch {
    // Not installed.
  }
};

const screenshot = (device: Device) => {
  const dir = path.join(getStateDir("screenshots"), device.key);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "release-smoke.png");
  simctl(["io", device.id, "screenshot", file]);
  return file;
};

/** Launch the app, stream its log, and judge the first seconds. */
const watchLaunch = async (
  device: Device,
  { bundleId, executable }: { bundleId: string; executable: string }
) => {
  step("Launch");
  let log = "";
  const stream = spawn(
    "xcrun",
    [
      "simctl",
      "spawn",
      device.id,
      "log",
      "stream",
      "--style",
      "compact",
      "--predicate",
      `process == "${executable}"`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  stream.stdout.on("data", (chunk: Buffer) => {
    appendRunLog(chunk);
    log += chunk.toString();
  });
  try {
    // log stream needs a moment to attach before the first app line.
    await sleep(2000);
    const launched = simctl(["launch", device.id, bundleId]);
    const pid = Number(/:\s*(?<pid>\d+)/u.exec(launched)?.groups?.pid);
    note(`Launched ${bundleId} (pid ${pid || "unknown"})`);
    step("Watch");
    const deadline = Date.now() + WATCH_SECONDS * 1000;
    while (Date.now() < deadline) {
      const verdict = judgeIosLaunch({ log, isRunning: isProcessAlive(pid) });
      if (verdict.status !== "pass") {
        // Give the crash report a moment to finish its lines.
        // oxlint-disable-next-line no-await-in-loop -- one settle wait before the verdict
        await sleep(1000);
        break;
      }
      // oxlint-disable-next-line no-await-in-loop -- polling log and process
      await sleep(500);
    }
    return judgeIosLaunch({ log, isRunning: isProcessAlive(pid) });
  } finally {
    stream.kill();
  }
};

const smokeIos = async (profile: ReleaseProfile) => {
  assertHostReady();
  step("Resolve build");
  const { build, isNativeMatch } = await pickIosBuild();
  const workDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "pixy-mood-tracker-release-smoke-")
  );
  try {
    const exported = await exportBundle(profile, workDir);
    const patched = patchApp(build.file, exported, workDir);
    step("Install");
    const device = await ensureDevice("ios");
    uninstall(device, patched.bundleId);
    installFile(device, patched.app, "preview");
    try {
      const verdict = await watchLaunch(device, patched);
      const file = screenshot(device);
      setResultPath(file);
      if (verdict.status === "crashed") {
        throw new CliError({
          status: "launch_crashed",
          message: `App crashed at launch with the ${profile} JS bundle`,
          why: verdict.detail,
          fix: `Fix the JS error, then rerun. The bundle differs from debug: check bundler flags in eas.json and metro.config.js.${isNativeMatch ? "" : " Native shell is from another fingerprint; on a missing native module, run `bun app build --platform=ios` first."} Screenshot: ${file}`,
        });
      }
      if (verdict.status === "exited") {
        throw new CliError({
          status: "launch_exited",
          message: `App quit within ${WATCH_SECONDS} seconds of launch`,
          why: "Process ended without a fatal JS log line. A native crash is likely.",
          fix: "Read the run log, and Console.app crash reports for the simulator, then retry.",
        });
      }
      note(`App ran ${WATCH_SECONDS} seconds without a fatal error`);
      console.log(file);
    } finally {
      // Remove the patched app. `bun app install` puts the cached build back.
      uninstall(device, patched.bundleId);
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

/** Run the release launch check for one platform. */
export const smokeFor = (values: Record<string, string | undefined>) => {
  // SAFETY: the parser checks --profile against RELEASE_PROFILES.
  const profile = (values.profile ?? "production") as ReleaseProfile;
  if (values.platform === "android") {
    throw new CliError({
      status: "platform_not_supported",
      message: "Release smoke does not support Android yet",
      why: "The cache holds no Android release APK to patch. Swapping the bundle also needs zipalign and apksigner.",
      fix: "Check Android with a full build: `bun app install --platform=android`, then `bun app open --platform=android`.",
    });
  }
  return smokeIos(profile);
};
