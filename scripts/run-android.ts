import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError } from "./cli/shared.ts";

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

const main = () => {
  const result = spawnSync("expo", ["run:android", ...process.argv.slice(2)], {
    env: { ...process.env, ...getAndroidBuildEnv() },
    stdio: "inherit",
  });

  if (result.error) {
    throw new CliError({
      fix: "Run `bun install` and retry `bun android`.",
      message: "Expo Android build could not start",
      status: "expo_start_failed",
      why: "The Expo CLI process could not start.",
    });
  }

  if (result.signal) {
    throw new CliError({
      fix: "Retry `bun android`. If the process keeps stopping, check system resources.",
      message: "Expo Android build was interrupted",
      status: "expo_interrupted",
      why: `The Expo CLI process received ${result.signal}.`,
    });
  }

  process.exitCode = result.status ?? 1;
};

try {
  main();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          fix: "Set up Android SDK and JDK 17, then retry `bun android`.",
          message: "Android build environment could not be prepared",
          status: "android_environment_error",
          why: "The local Android SDK or Java runtime could not be resolved.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
