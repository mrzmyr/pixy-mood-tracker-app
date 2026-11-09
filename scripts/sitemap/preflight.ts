// Host checks before any capture. Each prints one `ok|warn|fail <name>` line
// at once; failures add `why` and `fix`. Every check runs, then the run stops
// on the first failure, so one call names every problem.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createFingerprintAsync } from "@expo/fingerprint";

import { listBuilds, toBuildId } from "../cli/builds.ts";
import { MIN_FREE_BYTES, formatGiB, readFreeBytes } from "../cli/disk.ts";
import { readMemory } from "../cli/memory.ts";
import { CACHE_DIR, CliError } from "../cli/shared.ts";
import { REPO_ROOT } from "./inputs.ts";
import { DEVICE_PROFILE } from "./profile.ts";

const GIB = 1024 ** 3;
const RAM_RESERVE_BYTES = 4 * GIB;

interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
  why?: string;
  fix?: string;
}

const print = (check: Check) => {
  const lines = [
    `${check.status.padEnd(4)} ${check.name.padEnd(12)} ${check.detail}`,
  ];
  if (check.status !== "ok") {
    lines.push(`     why: ${check.why}`, `     fix: ${check.fix}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
};

const checkRam = (): Check => {
  const { available } = readMemory();
  const [load] = os.loadavg();
  const cores = os.availableParallelism();
  const detail = `${formatGiB(available)} available, load ${load.toFixed(1)} on ${cores} cores`;
  if (available < RAM_RESERVE_BYTES) {
    return {
      name: "ram",
      status: "fail",
      detail,
      why: `Less than ${formatGiB(RAM_RESERVE_BYTES)} RAM headroom. Simulator and agent-device time out.`,
      fix: "Close idle simulators, Metro, and builds (`bun devices list` names holders), then retry.",
    };
  }
  if (load > 2 * cores) {
    return {
      name: "load",
      status: "fail",
      detail,
      why: `1-minute load ${load.toFixed(0)} is above 2x ${cores} cores. Waits time out and look like app bugs.`,
      fix: "Wait for other builds or e2e runs to finish, then retry.",
    };
  }
  return { name: "ram", status: "ok", detail };
};

const checkDisk = (): Check => {
  const free = readFreeBytes();
  return free < MIN_FREE_BYTES
    ? {
        name: "disk",
        status: "fail",
        detail: `${formatGiB(free)} free`,
        why: `Export and patched app need room; below ${formatGiB(MIN_FREE_BYTES)} the CLI stops native work.`,
        fix: "Run `bun builds reclaim --dry-run`, then `bun builds reclaim`, then retry.",
      }
    : { name: "disk", status: "ok", detail: `${formatGiB(free)} free` };
};

/** Pinned runtime installed, and the host arch the cache key assumes. */
const checkRuntime = (): Check => {
  const { version, build } = DEVICE_PROFILE.runtime;
  let runtimes: {
    version: string;
    buildversion: string;
    isAvailable: boolean;
  }[] = [];
  try {
    // SAFETY: simctl list runtimes -j returns { runtimes: [...] }.
    const parsed = JSON.parse(
      execFileSync("xcrun", ["simctl", "list", "runtimes", "-j"], {
        encoding: "utf-8",
        timeout: 30_000,
      })
    ) as { runtimes: typeof runtimes };
    ({ runtimes } = parsed);
  } catch {
    // Reported below as missing.
  }
  const match = runtimes.find(
    (runtime) =>
      runtime.version === version &&
      runtime.buildversion === build &&
      runtime.isAvailable
  );
  if (!match) {
    return {
      name: "runtime",
      status: "fail",
      detail: `iOS ${version} (${build}) missing`,
      why: `Installed: ${runtimes.map((runtime) => `${runtime.version} (${runtime.buildversion})`).join(", ") || "none"}. Another runtime renders other pixels.`,
      fix: `Install iOS ${version} (${build}) in Xcode > Settings > Components, or \`xcodebuild -downloadPlatform iOS\` with the matching Xcode, then retry.`,
    };
  }
  if (os.arch() !== "arm64") {
    return {
      name: "runtime",
      status: "fail",
      detail: `iOS ${version} (${build}), host ${os.arch()}`,
      why: "Cached screenshots come from Apple silicon hosts. Intel hosts render other pixels.",
      fix: "Run the capture on an Apple silicon Mac or the macOS arm64 CI runner.",
    };
  }
  return {
    name: "runtime",
    status: "ok",
    detail: `iOS ${version} (${build}), ${DEVICE_PROFILE.model}, ${os.arch()}`,
  };
};

/**
 * Own copies of Release shells: `shells/<fingerprint>/<name>.app`. Other
 * sessions prune the shared build cache to free disk; an APFS clone here
 * keeps the shell without extra disk until a file changes.
 */
const SHELLS_DIR = path.join(CACHE_DIR, "sitemap", "shells");

interface Shell {
  file: string;
  fingerprint: string;
  id: string;
}

const listShells = (): Shell[] => {
  const shared = listBuilds()
    .filter(
      (build) =>
        build.platform === "ios" &&
        build.target === "simulator" &&
        build.isRelease &&
        build.file.endsWith(".app")
    )
    .map((build) => ({
      file: build.file,
      fingerprint: build.fingerprint,
      id: toBuildId(build.key),
    }));
  const own = fs.existsSync(SHELLS_DIR)
    ? fs.readdirSync(SHELLS_DIR).flatMap((fingerprint) =>
        fs
          .readdirSync(path.join(SHELLS_DIR, fingerprint))
          .filter((name) => name.endsWith(".app"))
          .map((name) => ({
            file: path.join(SHELLS_DIR, fingerprint, name),
            fingerprint,
            id: `sitemap-${fingerprint.slice(0, 8)}`,
          }))
      )
    : [];
  return [...own, ...shared];
};

/** Clone a shared shell into the sitemap cache once. */
const keepShell = (shell: Shell) => {
  if (shell.file.startsWith(SHELLS_DIR)) {
    return shell;
  }
  const dir = path.join(SHELLS_DIR, shell.fingerprint);
  const file = path.join(dir, path.basename(shell.file));
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync("cp", ["-cR", shell.file, file]);
  }
  return { ...shell, file };
};

/** Release shell with this commit's native fingerprint. */
const checkNativeShell = async (allowMismatch: boolean) => {
  const previous = process.env.EXPO_PUBLIC_APP_VARIANT;
  process.env.EXPO_PUBLIC_APP_VARIANT = "preview";
  const { hash } = await createFingerprintAsync(REPO_ROOT);
  process.env.EXPO_PUBLIC_APP_VARIANT = previous;
  const shells = listShells();
  const match = shells.find((shell) => shell.fingerprint === hash);
  const check: Check = match
    ? {
        name: "native",
        status: "ok",
        detail: `shell ${match.id} matches fingerprint ${hash.slice(0, 8)}`,
      }
    : {
        name: "native",
        status: allowMismatch && shells.length > 0 ? "warn" : "fail",
        detail: `no Release shell for fingerprint ${hash.slice(0, 8)}`,
        why: `Shells: ${shells.map((shell) => shell.id).join(", ") || "none"}. JS on another native shell can miss native modules and render other pixels.`,
        fix: "Run `bun app build --platform=ios` (cold build needs about 20 GiB free), then retry. --allow-native-mismatch captures anyway; such runs never deploy.",
      };
  const shell = match ?? shells[0];
  return { check, fingerprint: hash, shell: shell ? keepShell(shell) : null };
};

/** Capture builds embed the JS bundle, so Metro must not be the source. */
const checkToolchain = (): Check => {
  const expo = path.join(REPO_ROOT, "node_modules", "@expo", "cli");
  return fs.existsSync(expo)
    ? {
        name: "metro",
        status: "ok",
        detail:
          "not used: capture embeds an exported release bundle; `expo export` toolchain present",
      }
    : {
        name: "metro",
        status: "fail",
        detail: "`@expo/cli` missing",
        why: "node_modules is incomplete, so `expo export` cannot bundle the capture JS.",
        fix: "Run `bun install --frozen-lockfile` in this checkout. A `Cannot find module '@expo/cli/...'` checkout is broken: tell the user.",
      };
};

/** Run every check, print one line each, stop on any failure. */
export const runPreflight = async ({
  allowMismatch,
  source,
}: {
  allowMismatch: boolean;
  /** Result of the source pin, printed as its own check. */
  source: { sha: string; isDeployable: boolean };
}) => {
  const started = Date.now();
  const checks: Check[] = [];
  const add = (check: Check) => {
    checks.push(check);
    print(check);
  };
  add({
    name: "commit",
    status: source.isDeployable ? "ok" : "warn",
    detail: `${source.sha}${source.isDeployable ? " = origin/main" : " is not origin/main"}`,
    why: "Capture of HEAD with --ref=head.",
    fix: "Runs from HEAD never deploy. Capture from origin/main for the site.",
  });
  add(checkRam());
  add(checkDisk());
  add(checkRuntime());
  add(checkToolchain());
  const native = await checkNativeShell(allowMismatch);
  add(native.check);
  process.stdout.write(`preflight ${Date.now() - started}ms\n`);
  const failed = checks.find((check) => check.status === "fail");
  if (failed) {
    throw new CliError({
      status: `preflight_${failed.name}`,
      message: `Preflight failed: ${failed.name}`,
      why: failed.why ?? failed.detail,
      fix: failed.fix ?? "Fix the failed check, then retry.",
    });
  }
  return {
    fingerprint: native.fingerprint,
    shell: native.shell,
    isNativeMatch: native.check.status === "ok",
  };
};
