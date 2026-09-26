// `bun builds`: inspect and prune the shared build cache written by
// scripts/build-cache-provider.cjs.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  CHECKOUTS_DIR,
  CHECKOUT_FILE,
  CliError,
  DEFAULT_KEEP_BUILDS,
  DEFAULT_KEEP_WITHIN,
  PLATFORM_OPTION,
  defineCommand,
  formatAge,
  getPlatform,
  parseDuration,
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

// Short ID for a cache key: ios-f2ab57cc-Release-88f1470e0d69, or
// ios-device-f2ab57cc-unknown for a physical device build.
const toBuildId = (key: string) => {
  const groups = BUILD_KEY.exec(key)?.groups;
  if (!groups) {
    return key;
  }
  const { bundle, device = "", fingerprint, platform, variant } = groups;
  return `${platform}${device}-${fingerprint.slice(0, 8)}-${variant}${bundle ? `-${bundle}` : ""}`;
};

const formatSize = (bytes: number) => `${Math.round(bytes / 1_000_000)}M`;

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
      build.variant,
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

const parseKeep = (value: string) => {
  const keep = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(keep)) {
    throw new CliError({
      exitCode: 2,
      fix: `Pass a whole number, for example --keep ${DEFAULT_KEEP_BUILDS}.`,
      message: `Invalid --keep "${value}"`,
      status: "invalid_keep",
      why: "--keep is how many builds to keep per platform and variant.",
    });
  }
  return keep;
};

// Removes run state (locks, logs, Metro PID) of deleted checkouts. Folders
// without a checkout record are left alone.
const pruneCheckouts = (isDryRun: boolean) => {
  if (!fs.existsSync(CHECKOUTS_DIR)) {
    return;
  }
  for (const entry of fs.readdirSync(CHECKOUTS_DIR)) {
    const dir = path.join(CHECKOUTS_DIR, entry);
    const file = path.join(dir, CHECKOUT_FILE);
    const checkout = fs.existsSync(file)
      ? fs.readFileSync(file, "utf-8").trim()
      : "";
    if (checkout && !fs.existsSync(checkout)) {
      console.log(
        `${isDryRun ? "Would remove" : "Removed"} run files of deleted checkout ${checkout}`
      );
      if (!isDryRun) {
        fs.rmSync(dir, { force: true, recursive: true });
      }
    }
  }
};

// Keeps the newest `keep` builds per platform and variant, plus every build
// used within `keepWithin`. Removes the rest and abandoned temp copies.
const pruneBuilds = (
  keep = DEFAULT_KEEP_BUILDS,
  keepWithin = DEFAULT_KEEP_WITHIN,
  isDryRun = false
) => {
  const keepWithinMs = parseDuration(keepWithin);
  const groups = Map.groupBy(
    listBuilds(),
    (build) => `${build.platform}-${build.target}-${build.variant}`
  );
  const stale = [...groups.values()].flatMap((group) =>
    group
      .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(keep)
      .filter(
        (build) => Date.now() - Date.parse(build.lastUsedAt) > keepWithinMs
      )
  );
  for (const build of stale) {
    console.log(
      `${isDryRun ? "Would remove" : "Removed"} build ${build.id} (${formatSize(build.sizeBytes)}, last used ${formatAge(build.lastUsedAt)} ago)`
    );
    if (!isDryRun) {
      removeBuild(build);
    }
  }
  const tmpDir = path.join(buildCacheProvider.resolveCacheDir(), ".tmp");
  if (!isDryRun && fs.existsSync(tmpDir)) {
    for (const entry of fs.readdirSync(tmpDir)) {
      const tmpPath = path.join(tmpDir, entry);
      // Uploads finish within minutes; older temp copies are leftovers.
      if (Date.now() - fs.statSync(tmpPath).mtimeMs > 60 * 60_000) {
        fs.rmSync(tmpPath, { force: true, recursive: true });
      }
    }
  }
  pruneCheckouts(isDryRun);
  const freed = stale.reduce((sum, build) => sum + build.sizeBytes, 0);
  console.log(
    `${stale.length} build(s) ${isDryRun ? "to remove" : "removed"}, ${formatSize(freed)}.`
  );
};

const cmdBuildsRm = (target: string) => {
  const matches = listBuilds().filter(
    (build) => build.id === target || build.key.includes(target)
  );
  if (matches.length !== 1) {
    throw new CliError({
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
      details: `--platform ios|android  Only this platform.
--json                  Print JSON instead of a table.`,
      options: { ...PLATFORM_OPTION, json: { type: "boolean" } },
      run: (_args, values) =>
        cmdBuildsList(getPlatform(values.platform), values.json ?? false),
      summary: "List cached builds with variant, source, size, and last use",
    }),
    rm: defineCommand({
      args: ["<id>"],
      argsSource: "bun builds list",
      run: ([target]) => cmdBuildsRm(target),
      summary: "Remove one cached build",
    }),
    prune: defineCommand({
      details: `--keep <n>                Builds to keep per platform and variant (default: ${DEFAULT_KEEP_BUILDS}).
--keep-within <duration>  Also keep builds used this recently (default: ${DEFAULT_KEEP_WITHIN}).
--dry-run                 Print what would be removed.

Also removes run files (build locks, build logs, Metro PID and log) of deleted
worktrees from ~/.cache/pixy-mood-tracker/checkouts.`,
      options: {
        "dry-run": { type: "boolean" },
        keep: { default: String(DEFAULT_KEEP_BUILDS), type: "string" },
        "keep-within": { default: DEFAULT_KEEP_WITHIN, type: "string" },
      },
      run: (_args, values) =>
        pruneBuilds(
          parseKeep(values.keep),
          values["keep-within"],
          values["dry-run"] ?? false
        ),
      summary: "Remove old builds, keeping the newest and recently used",
    }),
  },
  footer: "Create builds with `bun app build`.",
  summary: "Inspect and prune the shared build cache.",
};

/** `bun builds` commands, plus the build list and IDs for the dashboard. */
export { BUILDS, listBuilds, pruneBuilds, toBuildId };
