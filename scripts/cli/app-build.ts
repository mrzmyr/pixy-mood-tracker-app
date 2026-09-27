import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { finished } from "node:stream/promises";

import { createFingerprintAsync } from "@expo/fingerprint";

import { ensurePrebuild, getAndroidBuildEnv } from "../run-native.ts";
import { withCacheLock } from "./cache-lock.ts";
import { toBuildId } from "./builds.ts";
import { buildIosPhone } from "./ios-phone-build.ts";
import { resolveDevice } from "./device.ts";
import { getPlatform } from "./options.ts";
import { CliError, getStateDir, note, withLogsOnStderr } from "./shared.ts";
import type { Platform } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
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

const getCache = async (platform: Platform) => {
  process.env.EXPO_PUBLIC_APP_VARIANT = "preview";
  const { hash } = await createFingerprintAsync(REPO_ROOT);
  const props: CacheProps = {
    platform,
    fingerprintHash: hash,
    projectRoot: REPO_ROOT,
    runOptions:
      platform === "ios"
        ? { configuration: "Release" }
        : { variant: "release" },
  };
  const key = buildCacheProvider.getCacheKey(props);
  const extension = platform === "ios" ? ".app" : ".apk";
  const file = path.join(
    buildCacheProvider.resolveCacheDir(),
    `${key}${extension}`
  );
  return { file, key, props };
};

// Streams native output into an external log while leaving stdout for build IDs.
const runLogged = async (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    logFile: string;
  }
) => {
  const log = fs.createWriteStream(options.logFile);
  note(`Log: ${options.logFile}`);
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk: Buffer) => log.write(chunk));
  child.stderr.on("data", (chunk: Buffer) => log.write(chunk));
  let code: number | null;
  try {
    // SAFETY: ChildProcess close passes exit code as its first value.
    [code] = (await once(child, "close")) as [number | null];
  } catch (error) {
    log.end();
    throw new CliError({
      status: "native_build_failed",
      message: `Could not start ${command}`,
      why: error instanceof Error ? error.message : String(error),
      fix: `Read ${options.logFile}, then retry.`,
    });
  }
  log.end();
  await finished(log);
  if (code !== 0) {
    throw new CliError({
      status: "native_build_failed",
      message: `${command} failed`,
      why: `Process exited with ${code}.`,
      fix: `Read ${options.logFile}, fix the cause, then retry.`,
    });
  }
};

const ensureBuild = async (platform: Platform) => {
  const cache = await getCache(platform);
  if (fs.existsSync(cache.file)) {
    note("Cached build found");
    return cache;
  }
  await withCacheLock(cache.file, async () => {
    if (platform === "ios") {
      await runLogged(
        "bun",
        [
          "scripts/run-native.ts",
          "ios",
          "--configuration",
          "Release",
          "--no-bundler",
          "--device",
          "generic",
          "--output",
          getStateDir("build"),
        ],
        {
          cwd: REPO_ROOT,
          env: { ...process.env, EXPO_PUBLIC_APP_VARIANT: "preview" },
          logFile: path.join(
            path.dirname(getStateDir("build")),
            "ios-build.log"
          ),
        }
      );
    } else {
      const env = {
        ...process.env,
        ...getAndroidBuildEnv(),
        EXPO_PUBLIC_APP_VARIANT: "preview",
      };
      await ensurePrebuild(
        "android",
        "preview",
        env,
        cache.props.fingerprintHash
      );
      await runLogged("./gradlew", ["app:assembleRelease", "--console=plain"], {
        cwd: path.join(REPO_ROOT, "android"),
        env,
        logFile: path.join(
          path.dirname(getStateDir("build")),
          "android-build.log"
        ),
      });
      const apk = path.join(
        REPO_ROOT,
        "android/app/build/outputs/apk/release/app-release.apk"
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
  const { key } = await ensureBuild(platform);
  console.log(toBuildId(key));
};

/** Resolve the cached build for one platform, building when needed. */
export const getCachedBuild = async (platform: Platform) => {
  const cache = await ensureBuild(platform);
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
  const device = await resolveDevice({ target: values.target });
  if (device.platform === "ios") {
    console.log(toBuildId(await buildIosPhone(device)));
    return;
  }
  return build("android");
};
