// Android capture app: a Release APK that Gradle builds in this checkout
// with the capture JS embedded. A JS swap into a cached APK cannot add image
// resources, so Android builds instead; after the first build only the JS
// bundle and packaging tasks run.
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";

import { CliError, note, readJson } from "../cli/shared.ts";
import { readProfileEnv } from "../cli/release-smoke.ts";
import { ensurePrebuild, getAndroidBuildEnv } from "../run-native.ts";
import type { Source } from "./inputs.ts";
import { REPO_ROOT } from "./inputs.ts";
import { CAPTURE_ENV } from "./profile.ts";

const ANDROID_DIR = path.join(REPO_ROOT, "android");

/** Gradle outputs of the JS bundle task; deleted so the capture env applies. */
const BUNDLE_OUTPUTS = [
  "app/build/generated/assets/createBundleReleaseJsAndAssets",
  "app/build/generated/res/createBundleReleaseJsAndAssets",
  "app/build/intermediates/sourcemaps/react/release",
];

const run = async (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; log: string }
) => {
  const log = fs.openSync(options.log, "a");
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", log, log],
  });
  // SAFETY: a ChildProcess "exit" event passes (code, signal) first.
  const [code] = (await once(child, "exit")) as [number | null];
  fs.closeSync(log);
  if (code !== 0) {
    throw new CliError({
      status: "android_build_failed",
      message: `\`${path.basename(command)} ${args.join(" ")}\` exited with ${code}`,
      why: `Last lines: ${fs.readFileSync(options.log, "utf-8").split("\n").slice(-8).join(" | ")}`,
      fix: `Read ${options.log}, fix the build, then retry.`,
    });
  }
};

/**
 * Library manifests Gradle rewrites in node_modules (the React Native plugin
 * drops their `package` attribute). The native fingerprint hashes them, so
 * the Gradle run must leave them as installed.
 */
const LIBRARY_MANIFESTS = [
  "node_modules/*/android/src/main/AndroidManifest.xml",
  "node_modules/@*/*/android/src/main/AndroidManifest.xml",
].map((pattern) => new Bun.Glob(pattern));

const keepLibraryManifests = async <T>(work: () => Promise<T>) => {
  const saved = new Map<string, string>();
  for (const glob of LIBRARY_MANIFESTS) {
    for (const file of glob.scanSync({ cwd: REPO_ROOT })) {
      const full = path.join(REPO_ROOT, file);
      saved.set(full, fs.readFileSync(full, "utf-8"));
    }
  }
  try {
    return await work();
  } finally {
    for (const [file, contents] of saved) {
      if (fs.readFileSync(file, "utf-8") !== contents) {
        fs.writeFileSync(file, contents);
      }
    }
  }
};

/**
 * Release APK with the capture JS for this source tree. Reused per source
 * tree and native fingerprint.
 */
export const prepareAndroidApp = async (
  source: Source,
  fingerprint: string,
  appsDir: string
) => {
  const dir = path.join(
    appsDir,
    `android-${source.sha.slice(0, 12)}-${source.tree.slice(0, 8)}-${fingerprint.slice(0, 8)}`
  );
  const marker = path.join(dir, "ready.json");
  const ready = readJson<{ apk: string }>(marker);
  if (ready && fs.existsSync(ready.apk)) {
    note(`Android capture app: reuse ${ready.apk}`);
    return ready.apk;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "tmp"), { recursive: true });
  const log = path.join(dir, "build.log");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...getAndroidBuildEnv(),
    ...readProfileEnv("preview"),
    ...CAPTURE_ENV,
    EXPO_PUBLIC_APP_VARIANT: "preview",
    // One ABI: four fill the disk, and the emulator is arm64.
    ORG_GRADLE_PROJECT_reactNativeArchitectures: "arm64-v8a",
    // Fresh Metro cache: metro.config.js keys it on the app variant only.
    TMPDIR: path.join(dir, "tmp"),
    SENTRY_DISABLE_AUTO_UPLOAD: "true",
    CI: "1",
  };
  const started = Date.now();
  note(`Android capture app: building, log ${log}`);
  await keepLibraryManifests(async () => {
    await ensurePrebuild("android", "preview", env, fingerprint);
    for (const output of BUNDLE_OUTPUTS) {
      fs.rmSync(path.join(ANDROID_DIR, output), {
        recursive: true,
        force: true,
      });
    }
    await run(
      path.join(ANDROID_DIR, "gradlew"),
      ["app:assembleRelease", "--console=plain"],
      { cwd: ANDROID_DIR, env, log }
    );
  });
  const built = path.join(
    ANDROID_DIR,
    "app/build/outputs/apk/release/app-release.apk"
  );
  const apk = path.join(dir, "app.apk");
  fs.copyFileSync(built, apk);
  fs.rmSync(path.join(dir, "tmp"), { recursive: true, force: true });
  fs.writeFileSync(marker, `${JSON.stringify({ apk })}\n`);
  note(
    `Android capture app: built in ${Math.round((Date.now() - started) / 1000)}s`
  );
  return apk;
};
