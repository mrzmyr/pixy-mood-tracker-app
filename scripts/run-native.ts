// `bun ios` and `bun android`: build and run one app variant.
//
// The native `ios/` and `android/` folders are generated output (Continuous
// Native Generation). This script regenerates them with `expo prebuild --clean`
// whenever the app variant or the native fingerprint changed since the last
// prebuild, so a build never reuses a folder generated for another variant.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createFingerprintAsync } from "@expo/fingerprint";

import { getAppVariant } from "../app.config.ts";
import { CliError } from "./cli/shared.ts";

type Platform = "ios" | "android";

const ROOT = path.resolve(import.meta.dirname, "..");

const getAndroidSdk = () =>
  [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
    "/opt/homebrew/share/android-commandlinetools",
  ].find((directory) =>
    directory
      ? fs.existsSync(path.join(directory, "emulator", "emulator"))
      : false
  );

const getJavaHome = () => {
  let javaHome = "";
  try {
    javaHome = execFileSync("/usr/libexec/java_home", ["-v", "17+"], {
      encoding: "utf-8",
      // Without a registered JDK it prints an error; Homebrew is checked next.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // Homebrew JDKs are not always registered with java_home.
  }

  return [
    process.env.JAVA_HOME,
    javaHome,
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home",
  ].find((directory) =>
    directory ? fs.existsSync(path.join(directory, "bin", "java")) : false
  );
};

const getAndroidBuildEnv = () => {
  const javaHome = getJavaHome();
  if (!javaHome) {
    throw new CliError({
      fix: "Install JDK 17 (`brew install openjdk@17`) or set JAVA_HOME to a JDK 17+ home.",
      message: "Java runtime not found",
      status: "java_missing",
      why: "Gradle needs JDK 17+. None found in JAVA_HOME, java_home, or Homebrew.",
    });
  }

  const sdk = getAndroidSdk();
  if (!sdk) {
    throw new CliError({
      fix: "Install Android SDK packages and set ANDROID_HOME to the SDK path.",
      message: "Android SDK not found",
      status: "android_sdk_missing",
      why: "No SDK emulator binary found in ANDROID_HOME, ANDROID_SDK_ROOT, or default macOS paths.",
    });
  }

  return {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    JAVA_HOME: javaHome,
    PATH: [path.join(javaHome, "bin"), process.env.PATH].join(path.delimiter),
  };
};

const getFingerprintHash = async () => {
  const fingerprint = await createFingerprintAsync(ROOT);
  return fingerprint.hash;
};

// Written after each prebuild. Identifies what the native folder was made from.
interface PrebuildStamp {
  variant: string;
  fingerprint: string;
}

const getStampFile = (platform: Platform) =>
  path.join(ROOT, platform, ".pixy-mood-tracker-prebuild.json");

const readStamp = (platform: Platform): PrebuildStamp | null => {
  try {
    // SAFETY: only this script writes the stamp, always as a PrebuildStamp.
    return JSON.parse(
      fs.readFileSync(getStampFile(platform), "utf-8")
    ) as PrebuildStamp;
  } catch {
    return null;
  }
};

// Full path, so it runs no matter how the caller was started. Only
// `bun <script>` puts node_modules/.bin on PATH.
const EXPO = path.join(ROOT, "node_modules", ".bin", "expo");

const runExpo = (args: string[], env: NodeJS.ProcessEnv) => {
  const result = spawnSync(EXPO, args, { cwd: ROOT, env, stdio: "inherit" });
  if (result.error) {
    throw new CliError({
      fix: "Run `bun install` and retry.",
      message: `\`expo ${args[0]}\` could not start`,
      status: "expo_start_failed",
      why: result.error.message,
    });
  }
  if (result.signal) {
    throw new CliError({
      fix: "Retry. If the process keeps stopping, check system resources.",
      message: `\`expo ${args[0]}\` was interrupted`,
      status: "expo_interrupted",
      why: `The Expo CLI process received ${result.signal}.`,
    });
  }
  return result.status ?? 1;
};

const ensurePrebuild = async (
  platform: Platform,
  variant: string,
  env: NodeJS.ProcessEnv,
  // Pass the hash when already computed; computing it takes seconds.
  fingerprintHash?: string
) => {
  const hash = fingerprintHash ?? (await getFingerprintHash());
  const stamp = readStamp(platform);
  if (stamp?.variant === variant && stamp.fingerprint === hash) {
    return;
  }
  console.log(
    stamp
      ? `${platform}/ was generated for ${stamp.variant} with other native inputs. Regenerating for ${variant}.`
      : `${platform}/ has no prebuild stamp. Generating it for ${variant}.`
  );
  // The native folders are gitignored, so the git status prompt never applies.
  const status = runExpo(["prebuild", "--clean", "--platform", platform], {
    ...env,
    EXPO_NO_GIT_STATUS: "1",
  });
  if (status !== 0) {
    throw new CliError({
      fix: "Fix the error printed by `expo prebuild` above, then retry.",
      message: `Generating ${platform}/ failed`,
      status: "prebuild_failed",
      why: `\`expo prebuild --clean --platform ${platform}\` exited with ${status}.`,
    });
  }
  fs.writeFileSync(
    getStampFile(platform),
    `${JSON.stringify({ fingerprint: hash, variant } satisfies PrebuildStamp, null, 2)}\n`
  );
};

const main = async () => {
  const [platform, ...args] = process.argv.slice(2);
  if (platform !== "ios" && platform !== "android") {
    throw new CliError({
      exitCode: 2,
      fix: "Run `bun ios` or `bun android`.",
      message: "Missing platform",
      status: "platform_missing",
      why: `Expected ios or android, got ${platform ?? "nothing"}.`,
    });
  }

  // `bun ios` builds the development app unless a variant is set.
  process.env.EXPO_PUBLIC_APP_VARIANT ??= "development";
  let variant: string;
  try {
    variant = getAppVariant();
  } catch {
    throw new CliError({
      exitCode: 2,
      fix: "Set EXPO_PUBLIC_APP_VARIANT to development, preview, or production.",
      message: "Unknown app variant",
      status: "app_variant_invalid",
      why: `EXPO_PUBLIC_APP_VARIANT is "${process.env.EXPO_PUBLIC_APP_VARIANT}".`,
    });
  }
  const env =
    platform === "android"
      ? { ...process.env, ...getAndroidBuildEnv() }
      : process.env;

  await ensurePrebuild(platform, variant, env);
  process.exitCode = runExpo([`run:${platform}`, ...args], env);
};

// `bun app build` imports ensurePrebuild; only a direct run builds.
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const fields =
      error instanceof CliError
        ? error
        : {
            fix: "Check the output above, then retry.",
            message: "Native build could not start",
            status: "native_build_error",
            why: error instanceof Error ? error.message : String(error),
          };
    console.error(
      `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
    );
    process.exitCode = 1;
  }
}

/** Prebuild plus the Android SDK and JDK lookup, for `bun app`. */
export { ensurePrebuild, getAndroidBuildEnv, getAndroidSdk };
