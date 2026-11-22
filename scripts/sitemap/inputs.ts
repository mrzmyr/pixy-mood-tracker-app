// Source pin and per-state input hashes.
//
// Input hash of a state = git blob ids of every file its route can load
// (static import closure from the route file, both root layouts, and the
// fixture and flag link routes, resolved per platform) + shared build inputs
// + native fingerprint + variant and its device profile + fixture, flags,
// route, and wait condition.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createFingerprintAsync } from "@expo/fingerprint";

import { CliError } from "../cli/shared.ts";
import { passFlags } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import {
  CLOCK_BUDGET_SECONDS,
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

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".cjs"];
/** Metro resolution order: platform file, native file, plain file. */
const resolveSuffixes = (platform: Platform) => [
  "",
  `.${platform}.tsx`,
  `.${platform}.ts`,
  ".native.tsx",
  ".native.ts",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  `/index.${platform}.tsx`,
  "/index.tsx",
  "/index.ts",
  "/index.js",
];

/** Static import graph of tracked source files, resolved lazily per file. */
export const createImportGraph = (
  blobs: Map<string, string>,
  platform: Platform
) => {
  const suffixes = resolveSuffixes(platform);
  // `.ts` needs the ts loader: tsx reads `<T>(value) =>` as JSX.
  const tsTranspiler = new Bun.Transpiler({ loader: "ts" });
  const tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
  const jsTranspiler = new Bun.Transpiler({ loader: "jsx" });
  const transpilerFor = (file: string) => {
    const extension = path.extname(file);
    if (extension === ".ts") {
      return tsTranspiler;
    }
    return extension === ".tsx" ? tsxTranspiler : jsTranspiler;
  };
  const edges = new Map<string, string[]>();

  const resolve = (spec: string, from: string) => {
    let base: string;
    if (spec.startsWith("@/")) {
      base = path.posix.join("src", spec.slice(2));
    } else if (spec.startsWith(".")) {
      base = path.posix.normalize(
        path.posix.join(path.posix.dirname(from), spec)
      );
    } else {
      // Packages: bun.lock is a shared input.
      return null;
    }
    for (const suffix of suffixes) {
      const candidate = `${base}${suffix}`;
      if (blobs.has(candidate)) {
        return candidate;
      }
    }
    return null;
  };

  const importsOf = (file: string) => {
    const cached = edges.get(file);
    if (cached) {
      return cached;
    }
    let found: string[] = [];
    if (SOURCE_EXTENSIONS.includes(path.extname(file))) {
      const code = fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");
      try {
        found = transpilerFor(file)
          .scanImports(code)
          .map((entry) => resolve(entry.path, file))
          .filter((entry): entry is string => entry !== null);
      } catch (error) {
        throw new CliError({
          status: "import_scan_failed",
          message: `Could not read imports of ${file}`,
          why: error instanceof Error ? error.message : String(error),
          fix: "Fix the syntax error in that file, then retry.",
        });
      }
    }
    edges.set(file, found);
    return found;
  };

  /** Every tracked file reachable from the entries, sorted. */
  const closure = (entries: string[]) => {
    const seen = new Set<string>();
    const queue = [...entries];
    while (queue.length > 0) {
      const file = queue.pop();
      if (file !== undefined && !seen.has(file)) {
        seen.add(file);
        queue.push(...importsOf(file));
      }
    }
    return [...seen].toSorted();
  };

  return { closure };
};

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

const ROOT_ENTRIES = [
  "src/app/_layout.tsx",
  "src/app/(app)/_layout.tsx",
  // Fixture and flag links end on the calendar; sheets show it behind them.
  "src/app/(app)/calendar.tsx",
  "src/app/(app)/dev/fixture.tsx",
  "src/app/(app)/dev/feature-flag.tsx",
];

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
const COMMON_PATTERNS = [
  /^package\.json$/u,
  /^bun\.lock$/u,
  /^(?:metro|babel)\.config\.js$/u,
  /^app\.(?:config\.ts|json)$/u,
  /^eas\.json$/u,
  /^tsconfig\.json$/u,
  /^patches\//u,
  /^assets\//u,
  /^scripts\/sitemap\/(?:capture-polyfill\.js|attempt\.ts|profile\.ts|png\.ts)$/u,
];

/** Input hashes for many states, sharing one import graph per platform. */
export const createInputHasher = ({
  source,
  nativeFingerprint,
}: {
  source: Source;
  nativeFingerprint: string;
}) => {
  const perPlatform = (platform: Platform) => {
    const graph = createImportGraph(source.blobs, platform);
    const patterns = [...COMMON_PATTERNS, ...SHARED_PATTERNS[platform]];
    const shared = hashList(
      [...source.blobs.entries()]
        .filter(([file]) => patterns.some((pattern) => pattern.test(file)))
        .toSorted(([a], [b]) => a.localeCompare(b))
    );
    const depsByRoute = new Map<string, string>();
    const depsHash = (route: string) => {
      const cached = depsByRoute.get(route);
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
      const files = graph.closure([routeFile, ...ROOT_ENTRIES]);
      const hash = hashList(
        files.map((file) => [file, source.blobs.get(file) ?? "missing"])
      );
      depsByRoute.set(route, hash);
      return hash;
    };
    return { shared, depsHash };
  };
  const platforms = {
    ios: perPlatform("ios"),
    android: perPlatform("android"),
  };

  /** Input hash of one state in one pass and variant. */
  return (
    screen: ScreenSpec,
    state: StateSpec,
    pass: Pass,
    variant: Variant
  ) => {
    const { route } = screen;
    const { shared, depsHash } = platforms[variant.platform];
    return sha256(
      JSON.stringify({
        schema: SCHEMA_VERSION,
        variant: variantId(variant),
        profile: profileOf(variant),
        clockBudget: CLOCK_BUDGET_SECONDS,
        nativeFingerprint,
        shared,
        deps: depsHash(route),
        route,
        fixture: state.fixture,
        flags: passFlags(screen, pass),
        wait: state.wait,
      })
    );
  };
};
