import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createFingerprintAsync } from "@expo/fingerprint";
import { ensurePrebuild } from "../run-native.ts";
import { readSigningTeams } from "./agent-device.ts";
import { withCacheLock } from "./cache-lock.ts";
import { includesPhone, readProfile } from "./provisioning.ts";
import {
  CliError,
  getCheckoutDir,
  getStateDir,
  note,
  withLogsOnStderr,
} from "./shared.ts";
import type { Platform } from "./shared.ts";
import { preflightPhone } from "./phone.ts";
import type { Device } from "./device.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const IOS_DIR = path.join(REPO_ROOT, "ios");
interface CacheProps {
  platform: Platform;
  fingerprintHash: string;
  runOptions: { configuration: string };
  projectRoot: string;
  target: "device";
}
interface CacheProvider {
  getCacheKey: (props: CacheProps) => string;
  resolveCacheDir: () => string;
  uploadBuildCache: (
    props: CacheProps & { buildPath: string; replace?: boolean }
  ) => Promise<string | null>;
}
interface CodeSigning {
  ensureDeviceIsCodeSignedForDeploymentAsync: (
    projectRoot: string
  ) => Promise<string | null>;
}
const localRequire = createRequire(import.meta.url);
// SAFETY: build-cache-provider.cjs exports the methods declared by CacheProvider.
const cache = localRequire("../build-cache-provider.cjs") as CacheProvider;
// SAFETY: Expo CLI exports the device-signing helper declared by CodeSigning.
const codeSigning = localRequire(
  "@expo/cli/build/src/run/ios/codeSigning/configureCodeSigning"
) as CodeSigning;

const hasPhoneProfile = (app: string, phoneId: string) => {
  const profile = readProfile(path.join(app, "embedded.mobileprovision"));
  return Boolean(profile && includesPhone(profile, phoneId));
};

const runBuildCommand = async (
  command: string,
  args: string[],
  cwd: string,
  logFile: string,
  team?: string
) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = fs.createWriteStream(logFile);
  let pending = "";
  const redact = (chunk: Buffer) => {
    const output = pending + chunk.toString("utf-8");
    if (!team) {
      log.write(output);
      return;
    }
    const safeLength = Math.max(0, output.length - team.length + 1);
    let writeLength = safeLength;
    for (let length = 1; length < team.length; length += 1) {
      if (output.slice(0, safeLength).endsWith(team.slice(0, length))) {
        writeLength = safeLength - length;
        break;
      }
    }
    log.write(output.slice(0, writeLength).replaceAll(team, "<team>"));
    pending = output.slice(writeLength);
  };
  child.stdout.on("data", redact);
  child.stderr.on("data", redact);
  // SAFETY: ChildProcess close passes exit code as its first event argument.
  const [code] = (await once(child, "close")) as [number | null];
  log.write(team ? pending.replaceAll(team, "<team>") : pending);
  log.end();
  if (code !== 0) {
    throw new CliError({
      status: "native_build_failed",
      message: `${command} failed`,
      why: `Process exited with ${code}.`,
      fix: `Read ${logFile}, fix the first error, then retry.`,
    });
  }
};

/** Build signed preview app for one iPhone, reusing cache only when profile covers that phone. */
export const buildIosPhone = async (device: Device) => {
  preflightPhone(device);
  process.env.EXPO_PUBLIC_APP_VARIANT = "preview";
  const fingerprint = await createFingerprintAsync(REPO_ROOT);
  const { hash: fingerprintHash } = fingerprint;
  const cacheProps: CacheProps = {
    fingerprintHash,
    platform: "ios",
    projectRoot: REPO_ROOT,
    runOptions: { configuration: "Release" },
    target: "device",
  };
  const key = cache.getCacheKey(cacheProps);
  const cached = path.join(cache.resolveCacheDir(), `${key}.app`);
  const reusable = () =>
    fs.existsSync(cached) && hasPhoneProfile(cached, device.id);
  if (reusable()) {
    note("Cached iPhone build found");
    return key;
  }
  await withCacheLock(cached, async () => {
    if (reusable()) {
      return;
    }
    const env = { ...process.env, EXPO_PUBLIC_APP_VARIANT: "preview" };
    await ensurePrebuild("ios", "preview", env, fingerprintHash);
    const podfile = path.join(IOS_DIR, "Podfile.lock");
    const manifest = path.join(IOS_DIR, "Pods/Manifest.lock");
    if (
      !fs.existsSync(podfile) ||
      fs.readFileSync(podfile, "utf-8") !==
        (fs.existsSync(manifest) ? fs.readFileSync(manifest, "utf-8") : "")
    ) {
      await runBuildCommand(
        "pod",
        ["install"],
        IOS_DIR,
        path.join(getStateDir("build"), "ios-phone-build.log")
      );
    }
    let team: string | null = null;
    try {
      team =
        await codeSigning.ensureDeviceIsCodeSignedForDeploymentAsync(REPO_ROOT);
    } catch (error) {
      throw new CliError({
        status: "signing_team_missing",
        message: "Could not resolve iPhone signing team",
        why:
          error instanceof Error
            ? error.message.replaceAll(/[A-Z0-9]{10}/gu, "<team>")
            : "Xcode code signing setup failed.",
        fix: "Open Xcode > Settings > Accounts, then retry.",
      });
    }
    const workspaceName = fs
      .readdirSync(IOS_DIR)
      .find((file) => file.endsWith(".xcworkspace"));
    if (!workspaceName) {
      throw new CliError({
        status: "xcode_workspace_missing",
        message: "No Xcode workspace in ios/",
        why: "Expo prebuild did not create an Xcode workspace.",
        fix: "Retry the iPhone build.",
      });
    }
    const workspace = path.join(IOS_DIR, workspaceName);
    const scheme = path.basename(workspaceName, ".xcworkspace");
    const logFile = path.join(getCheckoutDir(REPO_ROOT), "ios-phone-build.log");
    note(`Log: ${logFile}`);
    const args = [
      "-workspace",
      workspace,
      "-scheme",
      scheme,
      "-configuration",
      "Release",
      "-destination",
      `id=${device.id}`,
      "-derivedDataPath",
      path.join(IOS_DIR, "build"),
      "-allowProvisioningUpdates",
      "-allowProvisioningDeviceRegistration",
      ...(team ? [`DEVELOPMENT_TEAM=${team}`] : []),
      "build",
    ];
    note(
      `xcodebuild ${args.map((arg) => (arg.startsWith("DEVELOPMENT_TEAM=") ? "DEVELOPMENT_TEAM=<team>" : arg)).join(" ")}`
    );
    // Without a team from Expo, the Xcode project holds it. The log names it
    // either way, so redaction uses the team of the local certificate.
    const [localTeam] = readSigningTeams();
    await runBuildCommand(
      "xcodebuild",
      args,
      REPO_ROOT,
      logFile,
      team ?? localTeam
    );
    const app = path.join(
      IOS_DIR,
      "build/Build/Products/Release-iphoneos",
      `${scheme}.app`
    );
    if (!fs.existsSync(app)) {
      throw new CliError({
        status: "build_product_missing",
        message: "Built iPhone app not found",
        why: `xcodebuild did not create ${app}.`,
        fix: `Read ${logFile}, then retry.`,
      });
    }
    if (!hasPhoneProfile(app, device.id)) {
      throw new CliError({
        status: "signing_profile_missing",
        message: "Signing profile does not include this iPhone",
        why: "The built app profile does not list the selected phone.",
        fix: "Register the phone in Xcode, then rebuild.",
      });
    }
    const stored = await withLogsOnStderr(() =>
      cache.uploadBuildCache({
        ...cacheProps,
        buildPath: app,
        replace: fs.existsSync(cached),
      })
    );
    if (!stored) {
      throw new CliError({
        status: "build_cache_write_failed",
        message: "Could not store iPhone build",
        why: `Cache provider did not store ${app}.`,
        fix: "Check build cache permissions and free disk space, then retry.",
      });
    }
  });
  return key;
};
