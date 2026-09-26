// `bun app build`: compile one app variant for an iOS simulator or physical
// device and store it in the shared build cache. `bun app install` installs it.
// Expo's build-only mode (`expo run:ios --device generic`) targets simulators
// only, so this calls xcodebuild directly for both targets.
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import readline from "node:readline";
import { stripVTControlCharacters } from "node:util";

import { createFingerprintAsync } from "@expo/fingerprint";

import type { AppVariant } from "../../app.config.ts";
import { ensurePrebuild, getAndroidBuildEnv } from "../run-native.ts";
import { REPO_ROOT } from "./runs.ts";
import { CliError, note } from "./shared.ts";
import type { Platform, Steps } from "./shared.ts";

// Where the build runs: xcodebuild `generic/platform=iOS` or `iOS Simulator`.
type Destination = "device" | "simulator";

// Expo CLI's run options, which the cache key reads: `configuration` on iOS,
// `variant` (debug, release) on Android.
interface RunOptions {
  configuration?: string;
  variant?: string;
}

interface CacheProps {
  platform: Platform;
  fingerprintHash: string;
  runOptions: RunOptions;
  projectRoot: string;
  target?: Destination;
}

interface BuildCacheProvider {
  getCacheKey: (props: CacheProps) => string;
  resolveCacheDir: () => string;
  uploadBuildCache: (
    props: CacheProps & { buildPath: string }
  ) => Promise<string | null>;
}

interface CodeSigning {
  ensureDeviceIsCodeSignedForDeploymentAsync: (
    projectRoot: string
  ) => Promise<string | null>;
}

const localRequire = createRequire(import.meta.url);
// SAFETY: the provider module exports these functions; see its module.exports.
const buildCacheProvider = localRequire(
  "../build-cache-provider.cjs"
) as BuildCacheProvider;
// SAFETY: `expo run:ios` calls this export before device builds. It returns
// the team to sign with, or null when the Xcode project already has one.
const codeSigning = localRequire(
  "@expo/cli/build/src/run/ios/codeSigning/configureCodeSigning"
) as CodeSigning;

const IOS_DIR = path.join(REPO_ROOT, "ios");

const readFile = (file: string) => {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
};

// CocoaPods writes Pods/Manifest.lock as a copy of Podfile.lock after install.
const arePodsCurrent = () => {
  const lock = readFile(path.join(IOS_DIR, "Podfile.lock"));
  return (
    lock !== null &&
    lock === readFile(path.join(IOS_DIR, "Pods", "Manifest.lock"))
  );
};

// Lines worth showing live. The full output goes to the log file.
// Compiler errors: "<file>:<line>:<col>: error: <message>" (Xcode, Java) or
// "e: <file>" (Kotlin). Gradle summarizes under "What went wrong".
const ERROR_LINE = /(?:^|: )error: |^e: |^\* What went wrong:/u;
const LIVE_LINE =
  /(?:^|: )error: |^e: |\*\* BUILD|^BUILD (?:SUCCESSFUL|FAILED)|^\* What went wrong:/u;
// xcodebuild -showBuildTimingSummary: "CompileC (812 tasks) | 402.113 seconds".
const TIMING_LINE = /^(?<task>.+?) \| (?<seconds>[\d.]+) seconds$/u;

// Runs a command, writes every line with elapsed seconds to the log, prints
// errors live, and collects the xcodebuild timing summary.
const runLogged = async (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; log: fs.WriteStream }
) => {
  const start = performance.now();
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let firstError = "";
  const timings: { task: string; seconds: number }[] = [];
  const onLine = (line: string) => {
    const at = (performance.now() - start) / 1000;
    options.log.write(`[${at.toFixed(1).padStart(7)}s] ${line}\n`);
    const plain = stripVTControlCharacters(line).trim();
    const timing = TIMING_LINE.exec(plain)?.groups;
    if (timing) {
      timings.push({ seconds: Number(timing.seconds), task: timing.task });
    } else if (LIVE_LINE.test(plain)) {
      console.log(`  ${plain}`);
    }
    if (ERROR_LINE.test(plain)) {
      firstError ||= plain;
    }
  };
  readline.createInterface({ input: child.stdout }).on("line", onLine);
  readline.createInterface({ input: child.stderr }).on("line", onLine);
  // SAFETY: a ChildProcess "exit" event passes (code: number | null, signal).
  const [code] = (await once(child, "exit")) as [number | null];
  return { code, firstError, timings };
};

const printTaskTimings = (timings: { task: string; seconds: number }[]) => {
  if (timings.length === 0) {
    return;
  }
  note("\nSlowest xcodebuild tasks (summed across parallel jobs):");
  for (const { seconds, task } of timings
    .toSorted((a, b) => b.seconds - a.seconds)
    .slice(0, 8)) {
    note(`  ${`${seconds.toFixed(1)}s`.padStart(8)}  ${task}`);
  }
};

const getXcodeProject = () => {
  const workspace = fs
    .readdirSync(IOS_DIR)
    .find((file) => file.endsWith(".xcworkspace"));
  if (!workspace) {
    throw new CliError({
      fix: "Run `bun app build` again. If it fails again, delete ios/ and retry.",
      message: "No Xcode workspace in ios/",
      status: "xcode_workspace_missing",
      why: "expo prebuild and pod install should create ios/<App>.xcworkspace.",
    });
  }
  return {
    scheme: path.basename(workspace, ".xcworkspace"),
    workspace: path.join(IOS_DIR, workspace),
  };
};

const findApp = (productsDir: string) => {
  const app = fs.existsSync(productsDir)
    ? fs.readdirSync(productsDir).find((file) => file.endsWith(".app"))
    : undefined;
  if (!app) {
    throw new CliError({
      fix: "Check the log for the product path, then retry.",
      message: "Built app not found",
      status: "build_product_missing",
      why: `xcodebuild succeeded but ${productsDir} has no .app.`,
    });
  }
  return path.join(productsDir, app);
};

const buildIos = async (
  options: {
    destination: Destination;
    variant: AppVariant;
    isRebuild: boolean;
  },
  steps: Steps
) => {
  const { destination, variant } = options;
  // app.config.ts reads the variant, and the fingerprint covers app config.
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  const configuration = variant === "development" ? "Debug" : "Release";
  const { timed } = steps;

  const fingerprintHash = await timed(
    "Compute native fingerprint",
    undefined,
    async () => {
      const fingerprint = await createFingerprintAsync(REPO_ROOT);
      return fingerprint.hash;
    }
  );
  // Same run options as `bun ios` and `bun ios:preview`, so simulator keys
  // match the builds Expo CLI caches.
  const cacheProps: CacheProps = {
    fingerprintHash,
    platform: "ios",
    projectRoot: REPO_ROOT,
    runOptions: configuration === "Debug" ? {} : { configuration },
    target: destination === "device" ? "device" : undefined,
  };
  const key = buildCacheProvider.getCacheKey(cacheProps);
  const cached = path.join(buildCacheProvider.resolveCacheDir(), `${key}.app`);
  if (fs.existsSync(cached) && !options.isRebuild) {
    note(
      "  Cached build found, nothing to compile. Pass --rebuild to compile anyway."
    );
    return key;
  }

  await timed(
    `Generate ios/ for ${variant}, if stale`,
    `EXPO_PUBLIC_APP_VARIANT=${variant} expo prebuild --clean --platform ios`,
    () => ensurePrebuild("ios", variant, process.env)
  );

  const logFile = `/tmp/pixy-mood-tracker-ios-${destination}-${variant}-build.log`;
  const log = fs.createWriteStream(logFile);
  note(`\nFollow along: tail -f ${logFile}`);

  if (!arePodsCurrent()) {
    const pods = await timed("Install pods", "cd ios && pod install", () =>
      runLogged("pod", ["install"], { cwd: IOS_DIR, env: process.env, log })
    );
    if (pods.code !== 0) {
      throw new CliError({
        fix: `Read ${logFile}. With RVM, retry as \`env -u GEM_HOME -u GEM_PATH bun app build ...\`.`,
        message: "pod install failed",
        status: "pod_install_failed",
        why: pods.firstError || `pod install exited with ${pods.code}.`,
      });
    }
  }

  const team =
    destination === "device"
      ? await timed("Resolve signing team", undefined, () =>
          codeSigning.ensureDeviceIsCodeSignedForDeploymentAsync(REPO_ROOT)
        )
      : null;

  const { scheme, workspace } = getXcodeProject();
  const derivedData = path.join(IOS_DIR, "build");
  const args = [
    "-workspace",
    workspace,
    "-scheme",
    scheme,
    "-configuration",
    configuration,
    "-destination",
    destination === "device"
      ? "generic/platform=iOS"
      : "generic/platform=iOS Simulator",
    "-derivedDataPath",
    derivedData,
    "-showBuildTimingSummary",
    ...(destination === "device" ? ["-allowProvisioningUpdates"] : []),
    ...(team ? [`DEVELOPMENT_TEAM=${team}`] : []),
    "build",
  ];
  const shown = args
    .map((arg) =>
      arg.startsWith("DEVELOPMENT_TEAM=") ? "DEVELOPMENT_TEAM=<team>" : arg
    )
    .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
    .join(" ");
  const build = await timed(
    `Compile ${scheme} (${configuration}, ${destination})`,
    `xcodebuild ${shown}`,
    () =>
      runLogged("xcodebuild", args, { cwd: REPO_ROOT, env: process.env, log })
  );
  log.end();
  if (build.code !== 0) {
    throw new CliError({
      fix: `Read ${logFile}, fix the first error, then rerun.`,
      message: "xcodebuild failed",
      status: "native_build_failed",
      why: build.firstError || `xcodebuild exited with ${build.code}.`,
    });
  }

  const sdk = destination === "device" ? "iphoneos" : "iphonesimulator";
  const app = findApp(
    path.join(derivedData, "Build", "Products", `${configuration}-${sdk}`)
  );
  const stored = await timed(
    "Store in build cache",
    `cp -R ${path.relative(REPO_ROOT, app)} ${buildCacheProvider.resolveCacheDir()}/${key}.app`,
    () => buildCacheProvider.uploadBuildCache({ ...cacheProps, buildPath: app })
  );
  if (!stored) {
    throw new CliError({
      fix: "Check free disk space and permissions of the cache directory, then retry.",
      message: "Could not store the build",
      status: "build_cache_write_failed",
      why: `Copying ${app} into ${buildCacheProvider.resolveCacheDir()} failed.`,
    });
  }
  printTaskTimings(build.timings);
  note(`\nLog: ${logFile}`);
  return key;
};

const ANDROID_DIR = path.join(REPO_ROOT, "android");

// One APK runs on phones and emulators, so Android builds have no
// destination. Cache keys match `bun android`, so both reuse each other.
const buildAndroid = async (
  options: { variant: AppVariant; isRebuild: boolean },
  steps: Steps
) => {
  const { variant } = options;
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  const gradleVariant = variant === "development" ? "debug" : "release";
  const env = { ...process.env, ...getAndroidBuildEnv() };
  const { timed } = steps;

  const fingerprintHash = await timed(
    "Compute native fingerprint",
    undefined,
    async () => {
      const fingerprint = await createFingerprintAsync(REPO_ROOT);
      return fingerprint.hash;
    }
  );
  const cacheProps: CacheProps = {
    fingerprintHash,
    platform: "android",
    projectRoot: REPO_ROOT,
    runOptions: { variant: gradleVariant },
  };
  const key = buildCacheProvider.getCacheKey(cacheProps);
  const cached = path.join(buildCacheProvider.resolveCacheDir(), `${key}.apk`);
  if (fs.existsSync(cached) && !options.isRebuild) {
    note(
      "  Cached build found, nothing to compile. Pass --rebuild to compile anyway."
    );
    return key;
  }

  await timed(
    `Generate android/ for ${variant}, if stale`,
    `EXPO_PUBLIC_APP_VARIANT=${variant} expo prebuild --clean --platform android`,
    () => ensurePrebuild("android", variant, env)
  );

  const logFile = `/tmp/pixy-mood-tracker-android-${variant}-build.log`;
  const log = fs.createWriteStream(logFile);
  note(`\nFollow along: tail -f ${logFile}`);
  const task = `app:assemble${gradleVariant === "debug" ? "Debug" : "Release"}`;
  const build = await timed(
    `Compile with Gradle (${gradleVariant})`,
    `cd android && ./gradlew ${task} --console=plain`,
    () =>
      runLogged("./gradlew", [task, "--console=plain"], {
        cwd: ANDROID_DIR,
        env,
        log,
      })
  );
  log.end();
  if (build.code !== 0) {
    throw new CliError({
      fix: `Read ${logFile}, fix the first error, then rerun.`,
      message: "Gradle build failed",
      status: "native_build_failed",
      why: build.firstError || `gradlew exited with ${build.code}.`,
    });
  }

  const apk = path.join(
    ANDROID_DIR,
    "app/build/outputs/apk",
    gradleVariant,
    `app-${gradleVariant}.apk`
  );
  const stored = await timed(
    "Store in build cache",
    `cp ${path.relative(REPO_ROOT, apk)} ${buildCacheProvider.resolveCacheDir()}/${key}.apk`,
    () => buildCacheProvider.uploadBuildCache({ ...cacheProps, buildPath: apk })
  );
  if (!stored) {
    throw new CliError({
      fix: "Check the APK exists and the cache directory is writable, then retry.",
      message: "Could not store the build",
      status: "build_cache_write_failed",
      why: `Copying ${apk} into ${buildCacheProvider.resolveCacheDir()} failed.`,
    });
  }
  note(`\nLog: ${logFile}`);
  return key;
};

/** Compile one variant and return its cache key. */
export { buildAndroid, buildIos };
export type { Destination };
