import { spawnSync } from "node:child_process";

import { getAndroidBuildEnv } from "./cli/devices.ts";
import { CliError } from "./cli/shared.ts";

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
