import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { createFingerprintAsync } from "@expo/fingerprint";

import { ensurePrebuild, getAndroidBuildEnv } from "../run-native.ts";
import { withCacheLock } from "./cache-lock.ts";
import { toBuildId } from "./builds.ts";
import { buildIosPhone } from "./ios-phone-build.ts";
import { resolveDevice } from "./device.ts";
import { getPlatform } from "./options.ts";
import { openOutputLog, setResultPath, step } from "./run-log.ts";
import { CliError, getStateDir, note, withLogsOnStderr } from "./shared.ts";
import type { Platform } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
/** App variants this CLI builds. `development` is the dev client, loads JS from Metro. */
export type BuildVariant = "preview" | "development";
interface CacheProps {
  platform: Platform;
  fingerprintHash: string;
  runOptions: { configuration?: string; variant?: string };
  projectRoot: string;
}
interface BuildCacheProvider {
  getCacheKey: (props: CacheProps) => string;
  resolveBuildCache: (props: CacheProps) => Promise<string | null>;
  resolveCacheDir: () => string;
  uploadBuildCache: (
    props: CacheProps & { buildPath: string }
  ) => Promise<string | null>;
}
const localRequire = createRequire(import.meta.url);
// SAFETY: the provider exports these three functions.
const buildCacheProvider = localRequire(
  "../build-cache-provider.cjs"
) as BuildCacheProvider;

// Expo CLI run options per variant. The dev client is a Debug build: Expo
// reports iOS Debug as `unknown` and Android as `debug`. Its cache key covers
// the native fingerprint only, so every worktree with the same native
// dependencies shares one dev client.
const RUN_OPTIONS: Record<
  BuildVariant,
  Record<Platform, CacheProps["runOptions"]>
> = {
  development: { android: { variant: "debug" }, ios: {} },
  preview: {
    android: { variant: "release" },
    ios: { configuration: "Release" },
  },
};

const getCache = async (platform: Platform, variant: BuildVariant) => {
  step("Fingerprint");
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  const { hash } = await createFingerprintAsync(REPO_ROOT);
  const props: CacheProps = {
    platform,
    fingerprintHash: hash,
    projectRoot: REPO_ROOT,
    runOptions: RUN_OPTIONS[variant][platform],
  };
  const key = buildCacheProvider.getCacheKey(props);
  const extension = platform === "ios" ? ".app" : ".apk";
  const file = path.join(
    buildCacheProvider.resolveCacheDir(),
    `${key}${extension}`
  );
  return { file, key, props };
};

// Streams native output into the run log while leaving stdout for build IDs.
const runLogged = async (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    logName: string;
  }
) => {
  const log = openOutputLog(getStateDir("logs"), options.logName);
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", log.write);
  child.stderr.on("data", log.write);
  let code: number | null;
  try {
    // SAFETY: ChildProcess close passes exit code as its first value.
    [code] = (await once(child, "close")) as [number | null];
  } catch (error) {
    throw new CliError({
      status: "native_build_failed",
      message: `Could not start ${command}`,
      why: error instanceof Error ? error.message : String(error),
      fix: `Read ${log.file}, then retry.`,
    });
  } finally {
    log.close();
  }
  if (code !== 0) {
    throw new CliError({
      status: "native_build_failed",
      message: `${command} failed`,
      why: `Process exited with ${code}.`,
      fix: `Read ${log.file}, fix the cause, then retry.`,
    });
  }
};

const ensureBuild = async (
  platform: Platform,
  variant: BuildVariant = "preview"
) => {
  const cache = await getCache(platform, variant);
  step("Build");
  if (fs.existsSync(cache.file)) {
    note("Cached build found");
    return cache;
  }
  const isRelease = variant === "preview";
  await withCacheLock(cache.file, async () => {
    if (platform === "ios") {
      // Expo CLI stores a generic simulator build in the cache itself.
      await runLogged(
        "bun",
        [
          "scripts/run-native.ts",
          "ios",
          ...(isRelease ? ["--configuration", "Release"] : []),
          "--no-bundler",
          "--device",
          "generic",
          "--output",
          getStateDir("build"),
        ],
        {
          cwd: REPO_ROOT,
          env: { ...process.env, EXPO_PUBLIC_APP_VARIANT: variant },
          logName: "ios-build",
        }
      );
    } else {
      const env = {
        ...process.env,
        ...getAndroidBuildEnv(),
        EXPO_PUBLIC_APP_VARIANT: variant,
      };
      await ensurePrebuild(
        "android",
        variant,
        env,
        cache.props.fingerprintHash
      );
      const gradleVariant = isRelease ? "release" : "debug";
      await runLogged(
        "./gradlew",
        [`app:assemble${isRelease ? "Release" : "Debug"}`, "--console=plain"],
        {
          cwd: path.join(REPO_ROOT, "android"),
          env,
          logName: "android-build",
        }
      );
      const apk = path.join(
        REPO_ROOT,
        `android/app/build/outputs/apk/${gradleVariant}/app-${gradleVariant}.apk`
      );
      const stored = await withLogsOnStderr(() =>
        buildCacheProvider.uploadBuildCache({
          ...cache.props,
          buildPath: apk,
        })
      );
      if (!stored) {
        throw new CliError({
          status: "build_cache_write_failed",
          message: "Could not store Android build",
          why: `The cache provider did not store ${apk}.`,
          fix: "Check the APK and build cache permissions, then retry.",
        });
      }
    }
    if (!fs.existsSync(cache.file)) {
      throw new CliError({
        status: "build_cache_write_failed",
        message: "Native build was not cached",
        why: `No build at ${cache.file} after compilation.`,
        fix: "Read the native build log, then retry.",
      });
    }
  });
  return cache;
};

const build = async (platform: Platform) => {
  const { key, file } = await ensureBuild(platform);
  setResultPath(file);
  console.log(toBuildId(key));
};

/** Resolve the cached build for one platform and variant, building when needed. */
export const getCachedBuild = async (
  platform: Platform,
  variant: BuildVariant = "preview"
) => {
  const cache = await ensureBuild(platform, variant);
  return {
    key: cache.key,
    file: await withLogsOnStderr(() =>
      buildCacheProvider.resolveBuildCache(cache.props)
    ),
  };
};

/** Return the shared preview build cache directory. */
export const getBuildCacheDir = () => buildCacheProvider.resolveCacheDir();

/** Build the preview app for a platform or signed phone target. */
export const buildFor = async (values: Record<string, string | undefined>) => {
  if (!values.target) {
    return build(getPlatform(values.platform));
  }
  step("Resolve device");
  const device = await resolveDevice({ target: values.target });
  if (device.platform === "ios") {
    const key = await buildIosPhone(device);
    setResultPath(path.join(getBuildCacheDir(), `${key}.app`));
    console.log(toBuildId(key));
    return;
  }
  return build("android");
};
