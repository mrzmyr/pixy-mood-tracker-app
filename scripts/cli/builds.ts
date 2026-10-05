import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { agentDevice, stopStaleDaemon } from "./agent-device.ts";
import { formatGiB, measureSize, readFreeBytes } from "./disk.ts";
import { stopMetroIn } from "./metro.ts";
import { findReclaimable, selectStaleBuilds } from "./reclaim.ts";
import type { Candidate } from "./reclaim.ts";
import {
  CHECKOUTS_DIR,
  CHECKOUT_FILE,
  CliError,
  defineCommand,
  formatAge,
  note,
  printTable,
  readJson,
} from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

interface RunOptions {
  configuration?: string;
  variant?: string;
}

interface BuildCacheProvider {
  getCacheKey: (props: {
    platform: Platform;
    fingerprintHash: string;
    runOptions: RunOptions;
    projectRoot: string;
  }) => string;
  resolveCacheDir: () => string;
}

interface BuildMeta {
  key?: string;
  platform?: Platform;
  target?: string;
  appVariant?: string;
  variant?: string;
  branch?: string;
  commit?: string;
  isDirty?: boolean;
  worktree?: string;
  sizeBytes?: number;
  createdAt?: string;
  lastUsedAt?: string;
}

interface Build {
  key: string;
  id: string;
  file: string;
  platform: string;
  // simulator, emulator, or device.
  target: string;
  fingerprint: string;
  variant: string;
  isRelease: boolean;
  meta: BuildMeta;
  sizeBytes: number;
  createdAt: string;
  lastUsedAt: string;
}

interface DeviceClaim {
  owner?: { workspace?: string };
  device?: { id: string; platform: string };
}

const HOUR_MS = 60 * 60_000;
const PRUNE_OLDER_THAN_HOURS = 48;
const RECLAIM_OLDER_THAN_HOURS = 24;

const localRequire = createRequire(import.meta.url);
// SAFETY: the provider module exports these functions; see its module.exports.
const buildCacheProvider = localRequire(
  "../build-cache-provider.cjs"
) as BuildCacheProvider;

const BUILD_KEY =
  /^(?<platform>ios|android)(?<device>-device)?-(?<fingerprint>[0-9a-f]{40})-(?<variant>[^-]+)(?:-(?<bundle>[0-9a-f]{12}))?$/u;

const getSize = (target: string): number => {
  const stats = fs.statSync(target);
  return stats.isDirectory()
    ? fs
        .readdirSync(target)
        .reduce((total, entry) => total + getSize(path.join(target, entry)), 0)
    : stats.size;
};

const toBuildId = (key: string) => {
  const groups = BUILD_KEY.exec(key)?.groups;
  if (!groups) {
    return key;
  }
  const { bundle, device = "", fingerprint, platform, variant } = groups;
  return `${platform}${device}-${fingerprint.slice(0, 8)}-${variant}${bundle ? `-${bundle}` : ""}`;
};

const formatSize = (bytes: number) => `${Math.round(bytes / 1_000_000)}M`;

// Expo CLI names an iOS Debug build `unknown` when no configuration is passed.
const formatVariant = (variant: string) =>
  variant === "unknown" ? "Debug" : variant;

const listBuilds = (): Build[] => {
  const cacheDir = buildCacheProvider.resolveCacheDir();
  if (!fs.existsSync(cacheDir)) {
    return [];
  }
  return fs.readdirSync(cacheDir).flatMap((file) => {
    const key = path.parse(file).name;
    const match = BUILD_KEY.exec(key);
    if (!match?.groups || file.endsWith(".json")) {
      return [];
    }
    const { bundle, device, fingerprint, platform, variant } = match.groups;
    const fullPath = path.join(cacheDir, file);
    const meta = readJson<BuildMeta>(path.join(cacheDir, `${key}.json`)) ?? {};
    const createdAt =
      meta.createdAt ?? fs.statSync(fullPath).birthtime.toISOString();
    return [
      {
        createdAt,
        file: fullPath,
        fingerprint,
        id: toBuildId(key),
        isRelease: Boolean(bundle),
        key,
        lastUsedAt: meta.lastUsedAt ?? createdAt,
        meta,
        platform,
        sizeBytes: meta.sizeBytes ?? getSize(fullPath),
        target: device
          ? "device"
          : (meta.target ?? (platform === "ios" ? "simulator" : "emulator")),
        variant,
      },
    ];
  });
};

const describeSource = (meta: BuildMeta) =>
  meta.commit
    ? `${meta.branch || "detached"} ${meta.commit.slice(0, 7)}${meta.isDirty ? "+dirty" : ""}`
    : "unknown";

const cmdBuildsList = (platform: Platform | undefined, isJson: boolean) => {
  const builds = listBuilds()
    .filter((build) => !platform || build.platform === platform)
    .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  if (isJson) {
    console.log(JSON.stringify(builds, null, 2));
    return;
  }
  if (builds.length === 0) {
    console.log(`No cached builds in ${buildCacheProvider.resolveCacheDir()}.`);
    return;
  }
  printTable(
    [
      "ID",
      "OS",
      "TARGET",
      "APP",
      "VARIANT",
      "SOURCE",
      "SIZE",
      "CREATED",
      "LAST USED",
    ],
    builds.map((build) => [
      build.id,
      build.platform,
      build.target,
      build.meta.appVariant ?? "-",
      formatVariant(build.variant),
      describeSource(build.meta),
      formatSize(build.sizeBytes),
      formatAge(build.createdAt),
      formatAge(build.lastUsedAt),
    ])
  );
  const total = builds.reduce((sum, build) => sum + build.sizeBytes, 0);
  console.log(
    `\n${builds.length} build(s), ${formatSize(total)} in ${buildCacheProvider.resolveCacheDir()}`
  );
};

const removeBuild = (build: Build) => {
  fs.rmSync(build.file, { force: true, recursive: true });
  fs.rmSync(
    path.join(buildCacheProvider.resolveCacheDir(), `${build.key}.json`),
    { force: true }
  );
};

const releaseClaims = async (checkout: string) => {
  const live = await agentDevice<{ claims: DeviceClaim[] }>([
    "device",
    "status",
  ]);
  const stale = await agentDevice<{ claims: DeviceClaim[] }>([
    "device",
    "status",
    "--stale",
  ]);
  const claims = [...live.claims, ...stale.claims].filter(
    (claim) => claim.owner?.workspace === checkout
  );
  for (const claim of claims) {
    const { device } = claim;
    if (!device || !["ios", "android"].includes(device.platform)) {
      throw new CliError({
        status: "prune_claim_invalid",
        message: "Deleted checkout has an unsupported device claim",
        why: `Claim for ${checkout} has no supported device identity.`,
        fix: "Inspect `agent-device device status --json`, then retry prune.",
      });
    }
    const selector = device.platform === "ios" ? "--udid" : "--serial";
    // oxlint-disable-next-line no-await-in-loop -- release each exact claim before deleting sessions
    const result = await agentDevice<{
      released: unknown[];
      retained: unknown[];
      refused: unknown[];
      changed: unknown[];
    }>([
      "device",
      "release",
      "--stale",
      "--platform",
      device.platform,
      selector,
      device.id,
    ]);
    if (
      result.released.length !== 1 ||
      result.retained.length !== 0 ||
      result.refused.length !== 0 ||
      result.changed.length !== 0
    ) {
      throw new CliError({
        status: "prune_claim_release_failed",
        message: "Deleted checkout device claim was not released",
        why: `agent-device retained or refused ${device.platform} device ${device.id}.`,
        fix: "Inspect `agent-device device status --json`, then retry prune.",
      });
    }
  }
};

const removeSessions = (checkout: string) => {
  const sessionHash = crypto
    .createHash("sha256")
    .update(checkout)
    .digest("hex")
    .slice(0, 16);
  const sessionsDir = path.join(os.homedir(), ".agent-device", "sessions");
  if (!fs.existsSync(sessionsDir)) {
    return;
  }
  for (const session of fs.readdirSync(sessionsDir)) {
    if (session.startsWith(`cwd_${sessionHash}_`)) {
      fs.rmSync(path.join(sessionsDir, session), {
        recursive: true,
        force: true,
      });
    }
  }
};

const deleteSimulator = (entry: string) => {
  const rawDevices = execFileSync(
    "xcrun",
    ["simctl", "list", "devices", "-j"],
    {
      encoding: "utf-8",
    }
  );
  // SAFETY: simctl list devices -j returns runtime groups with UDID, name, and state.
  const devices = JSON.parse(rawDevices) as {
    devices: Record<string, { udid: string; name: string; state: string }[]>;
  };
  const name = `pixy-mood-tracker-${entry}`;
  const simulator = Object.values(devices.devices)
    .flat()
    .find((device) => device.name === name);
  if (!simulator) {
    return;
  }
  if (simulator.state !== "Shutdown") {
    execFileSync("xcrun", ["simctl", "shutdown", simulator.udid]);
  }
  execFileSync("xcrun", ["simctl", "delete", simulator.udid]);
  console.log(`Deleted simulator ${name}`);
};

const pruneCheckout = async (entry: string) => {
  const dir = path.join(CHECKOUTS_DIR, entry);
  const file = path.join(dir, CHECKOUT_FILE);
  try {
    const checkout = fs.existsSync(file)
      ? fs.readFileSync(file, "utf-8").trim()
      : "";
    if (!checkout || fs.existsSync(checkout)) {
      return;
    }
    // A daemon started from this deleted worktree cannot release its claims.
    await stopStaleDaemon();
    await releaseClaims(checkout);
    removeSessions(checkout);
    deleteSimulator(entry);
    stopMetroIn(dir);
    fs.rmSync(dir, { force: true, recursive: true });
    console.log(`Removed run files of deleted checkout ${checkout}`);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      status: "prune_checkout_failed",
      message: "Deleted checkout could not be pruned",
      why: error instanceof Error ? error.message : String(error),
      fix: "Inspect simulator and checkout state, then retry prune.",
    });
  }
};

const pruneCheckouts = async () => {
  if (!fs.existsSync(CHECKOUTS_DIR)) {
    return;
  }
  for (const entry of fs.readdirSync(CHECKOUTS_DIR)) {
    // oxlint-disable-next-line no-await-in-loop -- prune one checkout at a time
    await pruneCheckout(entry);
  }
};

const parseHours = (value: string | undefined, fallback: number) => {
  if (value === undefined) {
    return fallback;
  }
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_value",
      message: `Invalid value "${value}" for --older-than`,
      why: "--older-than accepts a positive number of hours.",
      fix: "Pass hours, for example --older-than=12.",
    });
  }
  return hours;
};

const pruneBuilds = async (olderThanHours = PRUNE_OLDER_THAN_HOURS) => {
  const stale = selectStaleBuilds(
    listBuilds(),
    Date.now(),
    olderThanHours * HOUR_MS
  );
  for (const build of stale) {
    console.log(
      `Removed build ${build.id} (${formatSize(build.sizeBytes)}, last used ${formatAge(build.lastUsedAt)} ago)`
    );
    removeBuild(build);
  }
  const tmpDir = path.join(buildCacheProvider.resolveCacheDir(), ".tmp");
  if (fs.existsSync(tmpDir)) {
    for (const entry of fs.readdirSync(tmpDir)) {
      const tmpPath = path.join(tmpDir, entry);
      // Uploads finish within minutes; older temp copies are leftovers.
      if (Date.now() - fs.statSync(tmpPath).mtimeMs > 60 * 60_000) {
        fs.rmSync(tmpPath, { force: true, recursive: true });
      }
    }
  }
  await pruneCheckouts();
  const freed = stale.reduce((sum, build) => sum + build.sizeBytes, 0);
  console.log(`${stale.length} build(s) removed, ${formatSize(freed)}.`);
};

const formatBytes = (bytes: number | null) =>
  bytes === null ? "size unknown" : formatGiB(bytes);

const reclaim = (isDryRun: boolean, olderThanHours: number) => {
  const maxAgeMs = olderThanHours * HOUR_MS;
  const builds = selectStaleBuilds(listBuilds(), Date.now(), maxAgeMs).map(
    (build): Candidate => ({
      kind: "build",
      path: build.id,
      reason: `last used ${formatAge(build.lastUsedAt)} ago`,
      bytes: build.sizeBytes,
      remove: () => removeBuild(build),
    })
  );
  note("Measuring reclaimable space.");
  const { candidates, state } = findReclaimable(maxAgeMs, measureSize);
  if (state.hasUnknown) {
    note(
      "note: a native build runs outside known checkouts. Kept DerivedData and ios/build/Build of all existing checkouts."
    );
  }
  if (state.busy.size) {
    note(
      `note: kept build folders of busy checkouts: ${[...state.busy].join(", ")}`
    );
  }
  let freed = 0;
  let removed = 0;
  for (const candidate of [...builds, ...candidates]) {
    const line = `${candidate.kind} ${candidate.path} (${formatBytes(candidate.bytes)}): ${candidate.reason}`;
    if (isDryRun) {
      console.log(`Would remove ${line}`);
    } else {
      try {
        candidate.remove();
      } catch (error) {
        note(
          `warning [reclaim_remove_failed]: Could not remove ${candidate.kind} ${candidate.path}\n  why: ${error instanceof Error ? error.message : String(error)}\n  fix: Check permissions and whether a process uses it, then retry.`
        );
        continue;
      }
      console.log(`Removed ${line}`);
    }
    removed += 1;
    freed += candidate.bytes ?? 0;
  }
  console.log(
    isDryRun
      ? `${removed} item(s), ${formatGiB(freed)} reclaimable. Run without --dry-run to delete.`
      : `${removed} item(s) removed, ${formatGiB(freed)} freed. ${formatGiB(readFreeBytes())} free disk now.`
  );
};

const OLDER_THAN_OPTION = (hours: number) => ({
  value: "<hours>",
  description: [`Optional. Age in hours since last use. Default: ${hours}.`],
});

const cmdBuildsRm = (target: string) => {
  const matches = listBuilds().filter(
    (build) => build.id === target || build.key.includes(target)
  );
  if (matches.length !== 1) {
    throw new CliError({
      exitCode: 2,
      fix: "Run `bun builds list` and pass one ID from the first column.",
      message: `${matches.length === 0 ? "No" : "More than one"} build matches "${target}"`,
      status: matches.length === 0 ? "build_not_found" : "build_ambiguous",
      why: "rm removes exactly one build.",
    });
  }
  removeBuild(matches[0]);
  console.log(`Removed build ${matches[0].id}`);
};

const BUILDS: Noun = {
  commands: {
    list: defineCommand({
      run: () => cmdBuildsList(undefined, false),
      summary: "List cached builds with variant, source, size, and last use",
    }),
    rm: defineCommand({
      options: {
        build: {
          value: "<id>",
          description: [
            "Required. ID from the first column of `bun builds list`.",
          ],
          isRequired: true,
        },
      },
      sections: [
        {
          title: "Examples",
          lines: ["bun builds rm --build=ios-3fa91c02-Release-9b1e44d0a7c2"],
        },
      ],
      errors: {
        missing_option: "No --build passed",
        build_not_found: "No build, or more than one build, matches --build",
      },
      run: (values) => cmdBuildsRm(values.build ?? ""),
      summary: "Remove one cached build.",
    }),
    prune: defineCommand({
      options: { "older-than": OLDER_THAN_OPTION(PRUNE_OLDER_THAN_HOURS) },
      usage: "Usage: bun builds prune [--older-than=<hours>]",
      errors: {
        invalid_value: "--older-than is not a positive number",
      },
      run: (values) =>
        pruneBuilds(parseHours(values["older-than"], PRUNE_OLDER_THAN_HOURS)),
      summary: "Remove old builds and state of deleted worktrees",
    }),
    reclaim: defineCommand({
      options: {
        "dry-run": {
          description: [
            "Optional. List what reclaim would delete, delete nothing.",
          ],
        },
        "older-than": OLDER_THAN_OPTION(RECLAIM_OLDER_THAN_HOURS),
      },
      usage: "Usage: bun builds reclaim [--dry-run] [--older-than=<hours>]",
      sections: [
        {
          title: "Behavior",
          lines: [
            "Deletes only these, and prints each size:",
            "- Cached builds older than --older-than. Keeps newest per platform and variant.",
            "- Xcode DerivedData of this app for deleted or idle checkouts.",
            "- ios/build/Build of idle checkouts. Never ios/build itself or generated code.",
            "- Shut-down simulators of deleted checkouts. Other simulators stay.",
            "- e2e recordings older than --older-than.",
            "Idle: no xcodebuild, Gradle, pod, or native run process uses the checkout.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun builds reclaim --dry-run",
            "bun builds reclaim --older-than=6",
          ],
        },
      ],
      errors: {
        invalid_value: "--older-than is not a positive number",
      },
      run: (values) =>
        reclaim(
          values["dry-run"] === "true",
          parseHours(values["older-than"], RECLAIM_OLDER_THAN_HOURS)
        ),
      summary: "Free disk: delete old builds, build folders, and recordings",
    }),
  },
  footer: "Create builds with `bun app build`.",
  summary: "Inspect and prune the shared build cache.",
  helpTail: [
    "Run `bun builds <command> --help` for details. Aliases: ls = list, remove = rm.",
  ],
};

/** `bun builds` commands, build list, and cache IDs. */
export { BUILDS, listBuilds, pruneBuilds, pruneCheckouts, toBuildId };
