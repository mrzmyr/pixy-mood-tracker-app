// `bun builds`: inspect and prune the shared build cache written by
// scripts/build-cache-provider.cjs.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  CliError,
  DEFAULT_KEEP_BUILDS,
  DEFAULT_KEEP_RECENT,
  formatAge,
  getPlatform,
  getWorktree,
  parseDuration,
  printTable,
  readJson,
} from "./shared.ts";
import type { Command, Platform } from "./shared.ts";

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
  /^(?<platform>ios|android)-(?<fingerprint>[0-9a-f]{40})-(?<variant>[^-]+)(?:-(?<bundle>[0-9a-f]{12}))?$/u;

const getSize = (target: string): number => {
  const stats = fs.statSync(target);
  return stats.isDirectory()
    ? fs
        .readdirSync(target)
        .reduce((total, entry) => total + getSize(path.join(target, entry)), 0)
    : stats.size;
};

// Short ID for a cache key: ios-f2ab57cc-Release-88f1470e0d69.
const toBuildId = (key: string) => {
  const groups = BUILD_KEY.exec(key)?.groups;
  if (!groups) {
    return key;
  }
  const { bundle, fingerprint, platform, variant } = groups;
  return `${platform}-${fingerprint.slice(0, 8)}-${variant}${bundle ? `-${bundle}` : ""}`;
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
    const { bundle, fingerprint, platform, variant } = match.groups;
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
    ["ID", "OS", "VARIANT", "SOURCE", "SIZE", "CREATED", "LAST USED"],
    builds.map((build) => [
      build.id,
      build.platform,
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

interface Fingerprinter {
  createFingerprintAsync: (projectRoot: string) => Promise<{ hash: string }>;
}

// Same call Expo CLI makes before it looks up the cache.
const getFingerprint = async (worktree: string) => {
  const worktreeRequire = createRequire(path.join(worktree, "package.json"));
  // SAFETY: @expo/fingerprint exports createFingerprintAsync; Expo CLI uses it.
  const fingerprinter = worktreeRequire("@expo/fingerprint") as Fingerprinter;
  const { hash } = await fingerprinter.createFingerprintAsync(worktree);
  return hash;
};

// Mirrors the options `bun sessions run --build` and `bun ios` pass to Expo.
const getRunOptions = (platform: Platform, isRelease: boolean): RunOptions => {
  if (platform === "android") {
    return { variant: isRelease ? "release" : "debug" };
  }
  return isRelease ? { configuration: "Release" } : {};
};

const cmdBuildsCheck = async (
  platform: Platform | undefined,
  isRelease: boolean
) => {
  const worktree = getWorktree();
  console.log("Computing native fingerprint (takes up to a minute)...");
  const fingerprintHash = await getFingerprint(worktree);
  const builds = listBuilds();
  for (const os_ of platform ? [platform] : (["ios", "android"] as const)) {
    const key = buildCacheProvider.getCacheKey({
      fingerprintHash,
      platform: os_,
      projectRoot: worktree,
      runOptions: getRunOptions(os_, isRelease),
    });
    const hit = builds.find((build) => build.key === key);
    const label = `${os_} ${isRelease ? "release" : "debug"}`;
    if (hit) {
      console.log(
        `${label}: HIT ${hit.id} from ${describeSource(hit.meta)}, ${formatAge(hit.createdAt)} old. --build installs it without compiling.`
      );
      continue;
    }
    const sameNative = builds.filter(
      (build) =>
        build.platform === os_ &&
        build.fingerprint === fingerprintHash &&
        build.isRelease === isRelease
    );
    const reason =
      sameNative.length > 0
        ? `native code matches ${sameNative.length} cached build(s), but app source or EXPO_PUBLIC_* values differ. Xcode or Gradle rebuilds incrementally when this worktree built before`
        : "no cached build has this native fingerprint. Expect a full native build (about 10 minutes)";
    console.log(`${label}: MISS ${key}\n  ${reason}.`);
  }
};

const removeBuild = (build: Build) => {
  fs.rmSync(build.file, { force: true, recursive: true });
  fs.rmSync(
    path.join(buildCacheProvider.resolveCacheDir(), `${build.key}.json`),
    { force: true }
  );
};

// Keeps the newest `keep` builds per platform and variant, plus every build
// used within `keepRecent`. Removes the rest and abandoned temp copies.
const pruneBuilds = (keep: number, keepRecent: string, isDryRun: boolean) => {
  const keepRecentMs = parseDuration(keepRecent);
  const groups = Map.groupBy(
    listBuilds(),
    (build) => `${build.platform}-${build.variant}`
  );
  const stale = [...groups.values()].flatMap((group) =>
    group
      .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(keep)
      .filter(
        (build) => Date.now() - Date.parse(build.lastUsedAt) > keepRecentMs
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
  const freed = stale.reduce((sum, build) => sum + build.sizeBytes, 0);
  console.log(
    `${stale.length} build(s) ${isDryRun ? "to remove" : "removed"}, ${formatSize(freed)}.`
  );
};

const cmdBuildsRm = (target: string | undefined) => {
  const matches = listBuilds().filter(
    (build) => target && (build.id === target || build.key.includes(target))
  );
  if (matches.length !== 1) {
    throw new CliError({
      fix: "Run `bun builds list` and pass one ID from the first column.",
      message: `${matches.length === 0 ? "No" : "More than one"} build matches "${target ?? ""}"`,
      status: matches.length === 0 ? "build_not_found" : "build_ambiguous",
      why: "rm removes exactly one build.",
    });
  }
  removeBuild(matches[0]);
  console.log(`Removed build ${matches[0].id}`);
};

const BUILDS_HELP = `Inspect and prune the shared build cache.

Usage: bun builds <command> [options]

  list [--platform ios|android] [--json]
      Cached builds with variant, source branch and commit, size, and last use.
  check [--platform ios|android] [--release]
      Whether this worktree gets a cached build, and why not.
  prune [--keep ${DEFAULT_KEEP_BUILDS}] [--keep-recent ${DEFAULT_KEEP_RECENT}] [--dry-run]
      Keep the newest builds per platform and variant plus every build used
      within --keep-recent. Remove the rest.
  rm <id>
      Remove one cached build.`;

const BUILDS_COMMANDS = new Map(
  Object.entries({
    check: (_args, values) =>
      cmdBuildsCheck(getPlatform(values), values.release ?? false),
    help: () => console.log(BUILDS_HELP),
    list: (_args, values) =>
      cmdBuildsList(getPlatform(values), values.json ?? false),
    prune: (_args, values) =>
      pruneBuilds(
        Number(values.keep),
        values["keep-recent"],
        values["dry-run"] ?? false
      ),
    rm: ([target]) => cmdBuildsRm(target),
  } satisfies Record<string, Command>)
);

/** `bun builds` commands, plus the build list and IDs for the dashboard. */
export { BUILDS_COMMANDS, listBuilds, toBuildId };
