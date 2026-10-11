// Host preflight before native work: free disk and CPU load.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { CHECKOUTS_DIR, CliError, note } from "./shared.ts";

const GIB = 1024 ** 3;
/** Free disk below this stops builds, installs, and e2e runs. */
export const MIN_FREE_BYTES = 10 * GIB;
/** Default Xcode DerivedData folder. Simulator builds of every checkout land here. */
export const DERIVED_DATA_DIR = path.join(
  os.homedir(),
  "Library",
  "Developer",
  "Xcode",
  "DerivedData"
);

/** Xcode device symbol files. Xcode downloads them again when a device connects. */
const DEVICE_SUPPORT_DIR = path.join(
  os.homedir(),
  "Library",
  "Developer",
  "Xcode",
  "iOS DeviceSupport"
);
/** Gradle dependency cache. Gradle downloads it again on the next build. */
const GRADLE_CACHE_DIR = path.join(os.homedir(), ".gradle", "caches");
/** Bun package cache. Bun downloads it again on the next install. */
const BUN_CACHE_DIR = path.join(os.homedir(), ".bun", "install", "cache");

/**
 * Safe ways to free disk, in order. Each step deletes only data that tools
 * create again. Agents may run them without asking.
 */
export const FREE_DISK_STEPS = [
  "`bun builds reclaim --dry-run`, then `bun builds reclaim`",
  "`bun builds reclaim --older-than=1`",
  "`xcrun simctl delete unavailable` (simulators without an installed runtime)",
  `Delete old OS folders in \`${DEVICE_SUPPORT_DIR}\`. Keep the newest folder per device.`,
  `\`bun pm cache rm\` and \`npm cache clean --force\``,
  `When no Gradle process runs (\`pgrep -f GradleDaemon\` prints nothing): delete \`${GRADLE_CACHE_DIR}\``,
];

const localRequire = createRequire(import.meta.url);
// SAFETY: the provider module exports resolveCacheDir; see its module.exports.
const buildCacheProvider = localRequire("../build-cache-provider.cjs") as {
  resolveCacheDir: () => string;
};

/** Format bytes as GiB with one decimal. */
export const formatGiB = (bytes: number) => `${(bytes / GIB).toFixed(1)} GiB`;

/** Size of a file or folder in bytes from `du`, or null when unknown. */
export const measureSize = (target: string): number | null => {
  if (!fs.existsSync(target)) {
    return 0;
  }
  // du exits 1 on unreadable entries but still prints the total.
  const { stdout } = spawnSync("du", ["-sk", target], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 120_000,
  });
  const kib = Number(stdout?.split(/\s/u)[0]);
  return stdout && Number.isSafeInteger(kib) ? kib * 1024 : null;
};

/** Free bytes for unprivileged writes on the volume of the home folder. */
export const readFreeBytes = () => {
  const stats = fs.statfsSync(os.homedir());
  return stats.bavail * stats.bsize;
};

const describeSpaceUsers = () =>
  [
    { label: "build cache", dir: buildCacheProvider.resolveCacheDir() },
    { label: "Xcode DerivedData", dir: DERIVED_DATA_DIR },
    { label: "checkout run files", dir: CHECKOUTS_DIR },
    { label: "iOS DeviceSupport", dir: DEVICE_SUPPORT_DIR },
    { label: "Gradle caches", dir: GRADLE_CACHE_DIR },
    { label: "Bun cache", dir: BUN_CACHE_DIR },
  ]
    .map((user) => ({ ...user, bytes: measureSize(user.dir) }))
    .toSorted((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1))
    .map(
      ({ label, dir, bytes }) =>
        `${label} ${bytes === null ? "size unknown" : formatGiB(bytes)} (${dir})`
    )
    .join(", ");

/**
 * Stop when free disk is below 10 GiB. Warn when CPU load is above 2x cores.
 * Builds that run out of disk fail late and leave broken build folders.
 */
export const assertHostReady = () => {
  const free = readFreeBytes();
  if (free < MIN_FREE_BYTES) {
    note("Free disk low. Measuring known space users.");
    throw new CliError({
      status: "disk_low",
      message: "Free disk too low for native work",
      why: `${formatGiB(free)} free, need ${formatGiB(MIN_FREE_BYTES)}. Known space users: ${describeSpaceUsers()}.`,
      fix: [
        "Free disk without asking the user. Run these steps in order. Check free disk (`df -h ~`) after each step. Stop when 10 GiB is free, then retry.",
        ...FREE_DISK_STEPS.map((step, index) => `    ${index + 1}. ${step}`),
        "    Still low: stop and ask the user. Never delete files outside the paths above.",
      ].join("\n"),
    });
  }
  const [load] = os.loadavg();
  const cores = os.availableParallelism();
  if (load > 2 * cores) {
    note(
      `warning [load_high]: CPU load is high\n  why: 1-minute load average ${load.toFixed(0)} is above 2x ${cores} cores.\n  fix: Wait for other builds or e2e runs to finish before you start more.`
    );
  }
};
