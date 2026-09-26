// Closed preview app commands. Device and variant belong to the CLI.
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { finished } from "node:stream/promises";
import { setTimeout as sleep } from "node:timers/promises";

import { createFingerprintAsync } from "@expo/fingerprint";

import { APP_VARIANTS } from "../../app.config.ts";
import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import { ensurePrebuild, getAndroidBuildEnv } from "../run-native.ts";
import { agentDevice } from "./agent-device.ts";
import { pruneBuilds, toBuildId } from "./builds.ts";
import { deviceFlag, ensureDevice, findDevice } from "./device.ts";
import { CliError, defineCommand, getStateDir, note } from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const PREVIEW = APP_VARIANTS.preview;
const READY_SELECTORS = ['role="button" label="Start"', 'id="calendar"'];
const READY_TIMEOUT_MS = 120_000;
const BUILD_TIMEOUT_MS = 30 * 60_000;

interface CacheProps {
  platform: Platform;
  fingerprintHash: string;
  runOptions: { configuration?: string; variant?: string };
  projectRoot: string;
}
interface BuildCacheProvider {
  getCacheKey: (props: CacheProps) => string;
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

const getPlatform = (value: string | undefined): Platform => {
  if (value === "ios" || value === "android") {
    return value;
  }
  throw new CliError({
    exitCode: 2,
    status: "invalid_platform",
    message: `Unknown platform "${value ?? ""}"`,
    why: "App commands accept ios or android as the first argument.",
    fix: "Pass ios or android after the app verb.",
  });
};

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
    prefix?: string;
    isInstalled?: () => boolean;
  }
) => {
  const log = fs.createWriteStream(options.logFile);
  if (options.prefix) {
    log.write(`${options.prefix}\n`);
  }
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
    const output = fs.readFileSync(options.logFile, "utf-8");
    if (
      options.isInstalled &&
      output.includes("› Opening on") &&
      output.includes("Error: xcrun simctl openurl") &&
      options.isInstalled()
    ) {
      note("Expo launch failed after install; app is installed");
      return;
    }
    throw new CliError({
      status: "native_build_failed",
      message: `${command} failed`,
      why: `Process exited with ${code}.`,
      fix: `Read ${options.logFile}, fix the cause, then retry.`,
    });
  }
};

// One cache-key lock spans worktrees. A second build waits for the first upload.
const buildWithLock = async (file: string, work: () => Promise<void>) => {
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (!fs.existsSync(file)) {
    try {
      fs.mkdirSync(lock);
      try {
        if (!fs.existsSync(file)) {
          // oxlint-disable-next-line no-await-in-loop -- one lock owner builds
          await work();
        }
      } finally {
        fs.rmSync(lock, { recursive: true, force: true });
      }
      return;
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("EEXIST"))) {
        throw error;
      }
    }
    if (Date.now() >= deadline) {
      throw new CliError({
        status: "build_lock_timeout",
        message: "Build cache remained locked",
        why: `Another build held ${lock} for 30 minutes.`,
        fix: "Check the other build log and clear the stale lock after its process exits.",
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for other worktree's upload
    await sleep(1000);
  }
};

const build = async (platform: Platform) => {
  const cache = await getCache(platform);
  if (fs.existsSync(cache.file)) {
    note("Cached build found");
    console.log(toBuildId(cache.key));
    return;
  }
  await buildWithLock(cache.file, async () => {
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
      const stored = await buildCacheProvider.uploadBuildCache({
        ...cache.props,
        buildPath: apk,
      });
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
  console.log(toBuildId(cache.key));
};

const install = async (platform: Platform) => {
  const device = await ensureDevice(platform);
  const args = ["scripts/run-native.ts", platform];
  if (platform === "ios") {
    args.push(
      "--configuration",
      "Release",
      "--no-bundler",
      "--device",
      device.id
    );
  } else {
    args.push("--variant", "release", "--no-bundler", "--device", device.name);
  }
  const logFile = path.join(
    path.dirname(getStateDir("build")),
    `${platform}-install.log`
  );
  await runLogged("bun", args, {
    cwd: REPO_ROOT,
    env: { ...process.env, EXPO_PUBLIC_APP_VARIANT: "preview" },
    logFile,
    prefix:
      platform === "android" ? `Using --device ${device.name}` : undefined,
    isInstalled: () => {
      try {
        if (platform === "ios") {
          execFileSync("xcrun", [
            "simctl",
            "get_app_container",
            device.id,
            PREVIEW.appId,
          ]);
          return true;
        }
        const output = execFileSync(
          "adb",
          ["-s", device.id, "shell", "pm", "path", PREVIEW.appId],
          { encoding: "utf-8" }
        );
        return output.includes("package:");
      } catch {
        return false;
      }
    },
  });
  note(`Installed on ${device.name}`);
};

const getDeviceArgs = (platform: Platform, id: string) => [
  "--platform",
  platform,
  deviceFlag(platform),
  id,
];

const waitReady = async (platform: Platform, id: string) => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const selector of READY_SELECTORS) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- inspect current screen
        await agentDevice(
          ["is", "visible", selector, ...getDeviceArgs(platform, id)],
          { timeoutMs: 10_000 }
        );
        return;
      } catch (error) {
        const isNotVisible =
          error instanceof CliError &&
          ([
            "assertion_failed",
            "element_not_found",
            "not_visible",
            "is_not_visible",
            "agent_device_timeout",
          ].includes(error.status) ||
            (error.status === "command_failed" &&
              error.why.startsWith("selector_not_found")));
        if (!isNotVisible) {
          throw error;
        }
      }
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for first screen
    await sleep(1000);
  }
  const dir = getStateDir("screenshots");
  const screenshot = path.join(dir, "not-ready.png");
  const snapshot = path.join(dir, "not-ready.snapshot.txt");
  await agentDevice(["screenshot", screenshot, ...getDeviceArgs(platform, id)]);
  const tree = await agentDevice([
    "snapshot",
    "-i",
    ...getDeviceArgs(platform, id),
  ]);
  fs.writeFileSync(snapshot, `${JSON.stringify(tree, null, 2)}\n`);
  throw new CliError({
    status: "app_not_ready",
    message: "App did not show its first screen",
    why: "Neither onboarding Start button nor calendar appeared within 120 seconds.",
    fix: `Inspect ${screenshot} and ${snapshot}, fix the cause, then retry.`,
  });
};

const screenshot = async (platform: Platform, id: string, name: string) => {
  const file = path.join(getStateDir("screenshots"), name);
  await agentDevice(["screenshot", file, ...getDeviceArgs(platform, id)]);
  console.log(file);
};

const open = async (platform: Platform) => {
  const device = await ensureDevice(platform);
  await agentDevice(
    [
      "open",
      PREVIEW.appId,
      ...getDeviceArgs(platform, device.id),
      "--relaunch",
    ],
    { timeoutMs: READY_TIMEOUT_MS }
  );
  await waitReady(platform, device.id);
  await screenshot(platform, device.id, "open.png");
};

const seed = async (platform: Platform, fixtureId: string) => {
  const fixture = FIXTURES.find((candidate) => candidate.id === fixtureId);
  if (!fixture) {
    throw new CliError({
      exitCode: 2,
      status: "fixture_not_found",
      message: `Unknown fixture "${fixtureId}"`,
      why: "No fixture has that ID.",
      fix: `Use one of: ${FIXTURES.map((candidate) => candidate.id).join(", ")}.`,
    });
  }
  const device = await ensureDevice(platform);
  const url = `${PREVIEW.scheme}://dev/fixture?id=${fixtureId}`;
  await agentDevice([
    "open",
    PREVIEW.appId,
    url,
    ...getDeviceArgs(platform, device.id),
  ]);
  if (platform === "ios") {
    try {
      const alert = await agentDevice<{ message: string }>([
        "alert",
        "get",
        ...getDeviceArgs(platform, device.id),
      ]);
      if (!alert.message.startsWith("Open in “Pixy")) {
        throw new CliError({
          status: "unexpected_alert",
          message: "Unexpected iOS alert",
          why: `Alert says "${alert.message}".`,
          fix: "Dismiss the alert on the simulator, then retry.",
        });
      }
      await agentDevice([
        "press",
        'label="Open"',
        ...getDeviceArgs(platform, device.id),
      ]);
    } catch (error) {
      const isMissingAlert =
        error instanceof CliError &&
        (error.status === "alert_not_found" ||
          (error.status === "command_failed" &&
            error.message === "alert not found"));
      if (!isMissingAlert) {
        throw error;
      }
    }
  }
  await waitReady(platform, device.id);
  if (fixtureId === "seed") {
    const { items } = fixture.data;
    if (!Array.isArray(items) || items.length === 0) {
      throw new CliError({
        status: "fixture_invalid",
        message: "Seed fixture has no entries",
        why: "Calendar screenshot needs an entry date, but seed data has none.",
        fix: "Restore entries in src/dev/fixtures/seed.json, then retry.",
      });
    }
    let latest = items[0].date;
    for (const item of items) {
      if (item.date > latest) {
        latest = item.date;
      }
    }
    await agentDevice(
      [
        "scroll",
        "up",
        "--until",
        `id="calendar-day-${latest}"`,
        ...getDeviceArgs(platform, device.id),
      ],
      { timeoutMs: READY_TIMEOUT_MS }
    );
  }
  await screenshot(platform, device.id, `seed-${fixtureId}.png`);
};

const close = async (platform: Platform) => {
  const device = findDevice(platform);
  if (device) {
    if (platform === "android") {
      try {
        const result = execFileSync(
          "adb",
          ["-s", device.id, "shell", "pm", "clear", PREVIEW.appId],
          { encoding: "utf-8" }
        ).trim();
        if (result !== "Success") {
          throw new CliError({
            status: "app_clear_failed",
            message: "Android app data was not cleared",
            why: `pm clear returned "${result}".`,
            fix: "Check emulator state and retry close.",
          });
        }
      } catch (error) {
        if (error instanceof CliError) {
          throw error;
        }
        throw new CliError({
          status: "app_clear_failed",
          message: "Android app data could not be cleared",
          why: error instanceof Error ? error.message : String(error),
          fix: "Check emulator state and retry close.",
        });
      }
    }
    try {
      await agentDevice([
        "close",
        ...getDeviceArgs(platform, device.id),
        "--shutdown",
      ]);
    } catch (error) {
      if (
        !(
          error instanceof CliError &&
          ["session_not_found", "no_open_session"].includes(error.status)
        )
      ) {
        throw error;
      }
    }
    if (platform === "ios") {
      try {
        execFileSync("xcrun", ["simctl", "erase", device.id]);
      } catch (error) {
        throw new CliError({
          status: "simulator_erase_failed",
          message: "iOS simulator could not be erased",
          why: error instanceof Error ? error.message : String(error),
          fix: "Check simulator state with `xcrun simctl list devices`, then retry.",
        });
      }
    }
  }
  pruneBuilds();
  note("Closed device session");
};

const APP: Noun = {
  commands: {
    build: defineCommand({
      args: ["<ios|android>"],
      run: ([platform]) => build(getPlatform(platform)),
      summary: "Build the preview app into the shared cache",
    }),
    install: defineCommand({
      args: ["<ios|android>"],
      run: ([platform]) => install(getPlatform(platform)),
      summary: "Install the preview app on this checkout's device",
    }),
    open: defineCommand({
      args: ["<ios|android>"],
      run: ([platform]) => open(getPlatform(platform)),
      summary: "Open the preview app and capture its first screen",
    }),
    seed: defineCommand({
      args: ["<ios|android>", "<fixture-id>"],
      run: ([platform, fixtureId]) => seed(getPlatform(platform), fixtureId),
      summary: "Load a fixture and capture its first screen",
    }),
    close: defineCommand({
      args: ["<ios|android>"],
      run: ([platform]) => close(getPlatform(platform)),
      summary: "Reset and shut down this checkout's device",
    }),
  },
  summary: "Build, install, open, seed, and close the preview app.",
};

/** Closed preview app commands. */
export { APP };
