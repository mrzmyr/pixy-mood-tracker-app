// Source pin and per-state input hashes.
//
// Input hash of a state = git blob ids of every file its route can load
// (import closure from the route file, both root layouts, and the fixture
// and flag link routes, resolved per platform and per imported name) +
// capture-language text of the translation keys those files name + shared
// build inputs + native fingerprint + variant and its device profile +
// fixture, flags, route, and wait condition.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createFingerprintAsync } from "@expo/fingerprint";
import { z } from "zod";

import { CliError } from "../cli/shared.ts";
import { FEATURE_FLAGS } from "./flags.ts";
import type { FeatureFlag } from "./flags.ts";
import { createImportGraph } from "./import-graph.ts";
import type { ReadFile } from "./import-graph.ts";
import { passFlags } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import {
  CLOCK_BUDGET_SECONDS,
  DEVICE_PROFILE,
  SCHEMA_VERSION,
  profileOf,
  variantId,
} from "./profile.ts";
import type { Platform, Variant } from "./profile.ts";

/** Checkout root; capture reads source and git state from here. */
export const REPO_ROOT = path.resolve(import.meta.dir, "../..");

const git = (args: string[]) =>
  execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

/** Hex SHA-256: input hashes, PNG hashes, cache keys. */
export const sha256 = (value: string | Uint8Array) =>
  crypto.createHash("sha256").update(value).digest("hex");

const hashList = (entries: [string, string][]) =>
  sha256(entries.map(([file, blob]) => `${blob} ${file}`).join("\n"));

/** Checkout a capture or check reads: HEAD plus uncommitted changes. */
export interface Source {
  sha: string;
  /** Blob id of every tracked and untracked file, working tree included. */
  blobs: Map<string, string>;
  /** Hash of every blob; keys the capture app. */
  tree: string;
}

/**
 * Read the checkout as it is on disk. Input hashes use working-tree
 * content, so a capture before the commit matches the check after it.
 */
export const readSource = (): Source => {
  const dirty = [
    ...git(["diff", "--name-only", "HEAD"]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
  ].filter(Boolean);
  const blobs = new Map<string, string>();
  for (const line of git(["ls-files", "-s"]).split("\n")) {
    // <mode> <blob> <stage>\t<path>
    const tab = line.indexOf("\t");
    if (tab > 0) {
      blobs.set(line.slice(tab + 1), line.split(" ")[1]);
    }
  }
  for (const file of dirty) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      blobs.set(file, git(["hash-object", file]));
    } else {
      blobs.delete(file);
    }
  }
  const tree = hashList(
    [...blobs.entries()].toSorted(([a], [b]) => a.localeCompare(b))
  );
  return { sha: git(["rev-parse", "HEAD"]), blobs, tree };
};

/** Native fingerprint of the preview variant, the key of the Release shell. */
export const readNativeFingerprint = async () => {
  const previous = process.env.EXPO_PUBLIC_APP_VARIANT;
  process.env.EXPO_PUBLIC_APP_VARIANT = "preview";
  try {
    const fingerprint = await createFingerprintAsync(REPO_ROOT);
    return fingerprint.hash;
  } finally {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_APP_VARIANT;
    } else {
      process.env.EXPO_PUBLIC_APP_VARIANT = previous;
    }
  }
};

/** Reads a checkout file from the working tree. */
const readWorkingTree: ReadFile = (file) =>
  fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");

/** Route path to its file under src/app, for example /settings/data. */
export const findRouteFile = (
  route: string,
  blobs: Map<string, string>
): string | null => {
  const wanted = route.split("?")[0].split("/").filter(Boolean);
  const files = [...blobs.keys()].filter(
    (file) =>
      file.startsWith("src/app/") &&
      /\.tsx?$/u.test(file) &&
      !/\/_layout\.tsx?$/u.test(file)
  );
  const score = (file: string) => {
    const segments = file
      .replace(/^src\/app\//u, "")
      .replace(/\.tsx?$/u, "")
      .split("/")
      .filter((segment) => !/^\(.+\)$/u.test(segment));
    if (segments.at(-1) === "index") {
      segments.pop();
    }
    if (segments.length !== wanted.length) {
      return -1;
    }
    let exact = 0;
    for (const [index, segment] of segments.entries()) {
      if (segment === wanted[index]) {
        exact += 1;
      } else if (!/^\[.+\]$/u.test(segment)) {
        return -1;
      }
    }
    return exact;
  };
  let best: string | null = null;
  let bestScore = -1;
  for (const file of files) {
    const value = score(file);
    if (value > bestScore) {
      best = file;
      bestScore = value;
    }
  }
  return best;
};

const APP_LAYOUT = "src/app/(app)/_layout.tsx";
const ROOT_ENTRIES = [
  "src/app/_layout.tsx",
  APP_LAYOUT,
  "src/app/(app)/dev/fixture.tsx",
  "src/app/(app)/dev/feature-flag.tsx",
];
/** Fixture and flag links end on the calendar; sheets show it at the top. */
const CALENDAR = "src/app/(app)/calendar.tsx";

/**
 * Files outside the import graph that change any screenshot of a platform.
 * Capture driver files count; diff, attribution, and site code do not.
 */
const SHARED_PATTERNS: Record<Platform, RegExp[]> = {
  ios: [
    /^scripts\/sitemap\/device\.ts$/u,
    /^scripts\/cli\/release-smoke\.ts$/u,
  ],
  android: [/^scripts\/sitemap\/(?:device-android|android-app)\.ts$/u],
};
/**
 * package.json, bun.lock, app.json, and translations count only in part:
 * see packageInputs, lockInputs, appJsonInputs, and copyHash.
 */
const COMMON_PATTERNS = [
  /^(?:metro|babel)\.config\.js$/u,
  /^scripts\/sitemap\/capture-stubs\.cjs$/u,
  /^app\.config\.ts$/u,
  /^eas\.json$/u,
  /^tsconfig\.json$/u,
  /^patches\//u,
  /^scripts\/sitemap\/(?:capture-polyfill\.js|attempt\.ts|profile\.ts|png\.ts)$/u,
];

/** Translation tables. Only the capture language counts, key by key. */
const LOCALE_FILE = /^assets\/locales\/[^/]+\.json$/u;
const COPY_FILE = `assets/locales/${DEVICE_PROFILE.language}.json`;
/** Shortest template head or `+` head read as a translation key prefix. */
const MIN_KEY_PREFIX = 3;

/** Dev dependencies that transform app code: babel.config.js loads them. */
const BUNDLE_DEV_DEPENDENCIES = ["@babel/core", "babel-plugin-module-resolver"];

const PackageJson = z.looseObject({
  main: z.string().optional(),
  expo: z.json().optional(),
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
  overrides: z.json().optional(),
  patchedDependencies: z.json().optional(),
});

/** package.json without release version, scripts, and tool config. */
const packageInputs = (text: string) => {
  const pkg = PackageJson.parse(JSON.parse(text));
  return JSON.stringify({
    main: pkg.main,
    expo: pkg.expo,
    dependencies: pkg.dependencies,
    bundleDevDependencies: BUNDLE_DEV_DEPENDENCIES.map((name) => [
      name,
      pkg.devDependencies[name] ?? null,
    ]),
    overrides: pkg.overrides,
    patchedDependencies: pkg.patchedDependencies,
  });
};

const AppJson = z.looseObject({ expo: z.looseObject({}).default({}) });

/** app.json without the release version: no screen shows it. */
const appJsonInputs = (text: string) => {
  const config = AppJson.parse(JSON.parse(text));
  return JSON.stringify({ ...config, expo: { ...config.expo, version: null } });
};

/** bun.lock entry: `[name@version, registry, meta?, integrity?]`. */
const LockPackage = z.tuple([z.string(), z.string()]).rest(z.json());
const LockMeta = z.looseObject({
  dependencies: z.record(z.string(), z.string()).default({}),
  optionalDependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
});
const Lockfile = z.object({
  workspaces: z.record(
    z.string(),
    z.looseObject({
      dependencies: z.record(z.string(), z.string()).default({}),
    })
  ),
  overrides: z.json().optional(),
  patchedDependencies: z.json().optional(),
  packages: z.record(z.string(), LockPackage),
});

/**
 * bun.lock entries the app bundle can load: runtime dependencies and the
 * babel packages, with everything they depend on. Bumping a test or lint
 * tool keeps every hash.
 */
const lockInputs = (text: string) => {
  // bun.lock is JSON with trailing commas.
  const lock = Lockfile.parse(
    JSON.parse(text.replaceAll(/,(?<close>\s*[}\]])/gu, "$<close>"))
  );
  const used = new Map<string, z.infer<typeof LockPackage>>();
  // Name with the entry keys of its dependents: bun nests a package under
  // the key of the package that needs another version.
  const queue = [
    ...Object.keys(lock.workspaces[""]?.dependencies ?? {}),
    ...BUNDLE_DEV_DEPENDENCIES,
  ].map((name) => ({ name, chain: new Array<string>() }));
  for (let item = queue.pop(); item; item = queue.pop()) {
    const { name, chain } = item;
    const key = [...chain.toReversed(), ""]
      .map((parent) => (parent ? `${parent}/${name}` : name))
      .find((candidate) => candidate in lock.packages);
    const entry = key === undefined ? undefined : lock.packages[key];
    if (key === undefined || !entry || used.has(key)) {
      continue;
    }
    used.set(key, entry);
    const meta = LockMeta.safeParse(entry[2]);
    const dependencies = meta.success
      ? [
          ...Object.keys(meta.data.dependencies),
          ...Object.keys(meta.data.optionalDependencies),
          ...Object.keys(meta.data.peerDependencies),
        ]
      : [];
    for (const dependency of dependencies) {
      queue.push({ name: dependency, chain: [...chain, key] });
    }
  }
  return JSON.stringify({
    overrides: lock.overrides,
    patchedDependencies: lock.patchedDependencies,
    packages: [...used.entries()].toSorted(([a], [b]) => a.localeCompare(b)),
  });
};

/** Partly counted files and how to reduce each to what screens can show. */
const PARTIAL_INPUTS = {
  "package.json": packageInputs,
  "bun.lock": lockInputs,
  "app.json": appJsonInputs,
} satisfies Record<string, (text: string) => string>;

/** Translation table of the capture language: key to text or plural forms. */
const CopyTable = z.record(z.string(), z.json());

/** What makes a state's input hash, file by file, for stale reasons. */
export interface StateInputs {
  /** Files whose whole content counts. */
  files: string[];
  /** Files that count in part: package.json, bun.lock, app.json. */
  partial: string[];
  /** Translation keys whose capture-language text counts. */
  keys: string[];
}

/** Input hashes for many states, sharing one import graph per platform. */
export const createInputHasher = ({
  source,
  nativeFingerprint,
  read = readWorkingTree,
}: {
  source: Source;
  nativeFingerprint: string;
  read?: ReadFile;
}) => {
  const partialHash = Object.fromEntries(
    Object.entries(PARTIAL_INPUTS)
      .filter(([file]) => source.blobs.has(file))
      .map(([file, reduce]) => [file, sha256(reduce(read(file)))])
  );
  const copy = source.blobs.has(COPY_FILE)
    ? CopyTable.parse(JSON.parse(read(COPY_FILE)))
    : {};
  const copyKeys = Object.keys(copy).toSorted();

  const perPlatform = (platform: Platform) => {
    const graph = createImportGraph(source.blobs, platform, read);
    const patterns = [...COMMON_PATTERNS, ...SHARED_PATTERNS[platform]];
    const sharedFiles = [...source.blobs.keys()]
      .filter((file) => patterns.some((pattern) => pattern.test(file)))
      .toSorted();
    const shared = sha256(
      JSON.stringify({
        files: hashList(
          sharedFiles.map((file) => [file, source.blobs.get(file) ?? ""])
        ),
        partial: partialHash,
      })
    );
    const byRoute = new Map<
      string,
      { hash: string; flags: FeatureFlag[]; inputs: StateInputs }
    >();
    const routeInputs = (route: string) => {
      const cached = byRoute.get(route);
      if (cached) {
        return cached;
      }
      const routeFile = findRouteFile(route, source.blobs);
      if (!routeFile) {
        throw new CliError({
          status: "route_file_missing",
          message: `No route file for ${route}`,
          why: "No file under src/app matches the route path.",
          fix: "Fix the route in scripts/sitemap/states.ts, then retry.",
        });
      }
      const {
        files: reached,
        strings,
        prefixes,
      } = graph.closure([
        routeFile,
        ...ROOT_ENTRIES,
        ...(graph.isModal(APP_LAYOUT, routeFile) ? [CALENDAR] : []),
      ]);
      // package.json and app.json count without the release version, also
      // where code imports them: Settings shows the version of its last
      // capture.
      const files = [...reached.entries()].flatMap(
        ([file, hash]): [string, string][] =>
          LOCALE_FILE.test(file) ? [] : [[file, partialHash[file] ?? hash]]
      );
      const keyPrefixes = [...prefixes].filter(
        (prefix) => prefix.length >= MIN_KEY_PREFIX
      );
      const keys = copyKeys.filter(
        (key) =>
          strings.has(key) ||
          keyPrefixes.some((prefix) => key.startsWith(prefix))
      );
      // Flags no reached statement names cannot change this route.
      const flags = FEATURE_FLAGS.filter((flag) => strings.has(flag));
      const hash = sha256(
        JSON.stringify({
          files: hashList(files),
          copy: keys.map((key) => [key, copy[key]]),
        })
      );
      const result = {
        hash,
        flags,
        inputs: {
          files: [...sharedFiles, ...files.map(([file]) => file)],
          partial: Object.keys(partialHash),
          keys,
        },
      };
      byRoute.set(route, result);
      return result;
    };
    return { shared, routeInputs };
  };
  const platforms = {
    ios: perPlatform("ios"),
    android: perPlatform("android"),
  };

  /** Input hash of one state in one pass and variant. */
  const hash = (
    screen: ScreenSpec,
    state: StateSpec,
    pass: Pass,
    variant: Variant
  ) => {
    const { route } = screen;
    const { shared, routeInputs } = platforms[variant.platform];
    const deps = routeInputs(route);
    return sha256(
      JSON.stringify({
        schema: SCHEMA_VERSION,
        variant: variantId(variant),
        profile: profileOf(variant),
        clockBudget: CLOCK_BUDGET_SECONDS,
        nativeFingerprint,
        shared,
        deps: deps.hash,
        route,
        fixture: state.fixture,
        flags: passFlags(screen, pass).filter((flag) =>
          deps.flags.includes(flag)
        ),
        wait: state.wait,
      })
    );
  };
  /** Files and translation keys behind a screen's hash on a platform. */
  const inputsOf = (screen: ScreenSpec, variant: Variant) =>
    platforms[variant.platform].routeInputs(screen.route).inputs;
  return Object.assign(hash, { inputsOf });
};

/**
 * Files that differ from the main branch: commits since the merge base
 * with origin/main plus uncommitted changes. Empty without origin/main.
 */
export const readChangedFiles = (): Set<string> => {
  let base: string;
  try {
    base = git(["merge-base", "HEAD", "origin/main"]);
  } catch {
    return new Set();
  }
  const files = [
    ...git(["diff", "--name-only", base]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
  ].filter(Boolean);
  // package.json without a runtime change does not reach any state.
  const counts = (file: string) => {
    const reduce = Object.entries(PARTIAL_INPUTS).find(
      ([name]) => name === file
    )?.[1];
    if (!reduce || !fs.existsSync(path.join(REPO_ROOT, file))) {
      return true;
    }
    try {
      return (
        reduce(git(["show", `${base}:${file}`])) !==
        reduce(readWorkingTree(file))
      );
    } catch {
      return true;
    }
  };
  return new Set(files.filter(counts));
};

/**
 * Changed files a state reaches, for stale lines: `a.tsx, b.ts +3`, or
 * null when none does. A file counts even if only parts the state does not
 * reach changed.
 */
export const describeChange = (inputs: StateInputs, changed: Set<string>) => {
  if (changed.size === 0) {
    return null;
  }
  const hits = [...inputs.files, ...inputs.partial].filter((file) =>
    changed.has(file)
  );
  if (changed.has(COPY_FILE) && inputs.keys.length > 0) {
    hits.push(COPY_FILE);
  }
  if (hits.length === 0) {
    return null;
  }
  const shown = hits.slice(0, 3).map((file) => file.replace(/^src\//u, ""));
  const more = hits.length > 3 ? ` +${hits.length - 3}` : "";
  return `${shown.join(", ")}${more}`;
};
