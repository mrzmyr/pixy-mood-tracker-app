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
      fix: "Run `bun builds reclaim`, then retry.",
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
