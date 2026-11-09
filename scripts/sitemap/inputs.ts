// Source pin and per-state input hashes.
//
// Input hash of a state = git blob ids of every file its route can load
// (static import closure from the route file, both root layouts, and the
// fixture and flag link routes) + shared build inputs + native fingerprint
// + device profile + fixture, flags, route, and wait condition.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { CliError, note } from "../cli/shared.ts";
import { passFlags } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import {
  CLOCK_BUDGET_SECONDS,
  DEVICE_PROFILE,
  SCHEMA_VERSION,
} from "./profile.ts";

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

/** Commit a capture runs on, plus the blob id of every tracked file. */
export interface Source {
  sha: string;
  subject: string;
  /** Committer date, ISO 8601. */
  date: string;
  /** True only when HEAD is origin/main and the tree is clean. */
  isDeployable: boolean;
  blobs: Map<string, string>;
  /** Hash of every blob, uncommitted and untracked files included. */
  tree: string;
}

/**
 * Fetch origin, then pin the commit. Default: HEAD must equal origin/main
 * with a clean tree. `allowHead` captures HEAD as is, for capture logic work;
 * such runs never deploy.
 */
export const pinSource = ({ allowHead }: { allowHead: boolean }): Source => {
  try {
    git(["fetch", "origin", "main", "--quiet"]);
  } catch (error) {
    throw new CliError({
      status: "fetch_failed",
      message: "Could not fetch origin/main",
      why:
        error instanceof Error ? error.message.split("\n")[0] : String(error),
      fix: "Check network and GitHub access (`git fetch origin`), then retry.",
    });
  }
  const main = git(["rev-parse", "origin/main"]);
  const head = git(["rev-parse", "HEAD"]);
  // Tracked files that differ from HEAD, staged or not, and untracked files.
  const dirty = [
    ...git(["diff", "--name-only", "HEAD"]).split("\n"),
    ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
  ].filter(Boolean);
  const isDeployable = head === main && dirty.length === 0;
  if (!isDeployable && !allowHead) {
    throw new CliError({
      status: "source_not_origin_main",
      message: "Checkout is not origin/main",
      why:
        head === main
          ? `${dirty.length} tracked files changed: ${dirty.slice(0, 3).join(", ")}.`
          : `HEAD ${head.slice(0, 8)}, origin/main ${main.slice(0, 8)}.`,
      fix: "Capture from a clean checkout of origin/main: `bun worktree new sitemap-main --branch=sitemap-main` then `git -C <path> checkout --detach origin/main`. Pass --ref=head only for capture logic work; it never deploys.",
    });
  }
  const blobs = new Map<string, string>();
  for (const line of git(["ls-files", "-s"]).split("\n")) {
    // <mode> <blob> <stage>\t<path>
    const tab = line.indexOf("\t");
    if (tab > 0) {
      blobs.set(line.slice(tab + 1), line.split(" ")[1]);
    }
  }
  for (const file of dirty) {
    blobs.set(
      file,
      fs.existsSync(path.join(REPO_ROOT, file))
        ? git(["hash-object", file])
        : "deleted"
    );
  }
  const [subject, date] = git(["log", "-1", "--format=%s%n%cI", "HEAD"]).split(
    "\n"
  );
  note(
    `Source: ${head} ${isDeployable ? "(origin/main)" : "(HEAD, not deployable)"} ${subject}`
  );
  const tree = hashList(
    [...blobs.entries()].toSorted(([a], [b]) => a.localeCompare(b))
  );
  return { sha: head, subject, date, isDeployable, blobs, tree };
};

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".cjs"];
const RESOLVE_SUFFIXES = [
  "",
  ".ios.tsx",
  ".ios.ts",
  ".native.tsx",
  ".native.ts",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  "/index.ios.tsx",
  "/index.tsx",
  "/index.ts",
  "/index.js",
];

/** Static import graph of tracked source files, resolved lazily per file. */
export const createImportGraph = (blobs: Map<string, string>) => {
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
    for (const suffix of RESOLVE_SUFFIXES) {
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
 * Files outside the import graph that change any screenshot. Capture
 * driver files count; diff, attribution, and site code do not.
 */
const SHARED_PATTERNS = [
  /^package\.json$/u,
  /^bun\.lock$/u,
  /^(?:metro|babel)\.config\.js$/u,
  /^app\.(?:config\.ts|json)$/u,
  /^eas\.json$/u,
  /^tsconfig\.json$/u,
  /^patches\//u,
  /^assets\//u,
  /^scripts\/sitemap\/(?:capture-polyfill\.js|attempt\.ts|device\.ts|profile\.ts|png\.ts)$/u,
  /^scripts\/cli\/release-smoke\.ts$/u,
];

/** Input hashes for many states, sharing one import graph. */
export const createInputHasher = ({
  source,
  nativeFingerprint,
}: {
  source: Source;
  nativeFingerprint: string;
}) => {
  const graph = createImportGraph(source.blobs);
  const shared = hashList(
    [...source.blobs.entries()]
      .filter(([file]) => SHARED_PATTERNS.some((pattern) => pattern.test(file)))
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

  /** Input hash of one state in one pass. */
  return (screen: ScreenSpec, state: StateSpec, pass: Pass) => {
    const { route } = screen;
    return sha256(
      JSON.stringify({
        schema: SCHEMA_VERSION,
        profile: DEVICE_PROFILE,
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
