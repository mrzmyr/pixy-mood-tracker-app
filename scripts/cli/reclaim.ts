// `bun builds reclaim`: find disk space that is safe to free. Selection
// functions are pure; the readers around them collect machine state.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { APP_VARIANTS } from "../../app.config.ts";
import { DERIVED_DATA_DIR } from "./disk.ts";
import {
  CHECKOUTS_DIR,
  CHECKOUT_FILE,
  hashCheckout,
  tryRun,
} from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
// Xcode updates LastAccessedDate when it opens or builds the workspace.
const RECENT_ACCESS_MS = 60 * 60_000;
// Commands that write a checkout's native build folders.
const BUILD_PROCESS =
  /(?:^|\/)xcodebuild(?:\s|$)|GradleWrapperMain|(?:^|\/)gradlew(?:\s|$)|(?:^|\/)pod (?:install|update)\b|run-native\.ts/u;
const SIMULATOR_NAME = /^pixy-mood-tracker-(?<hash>[0-9a-f]{12})$/u;
// Expo prebuild names the workspace after the app name without spaces.
const WORKSPACE_NAMES = new Set(
  Object.values(APP_VARIANTS).map(
    ({ name }) => `${name.replaceAll(" ", "")}.xcworkspace`
  )
);

/** One running process: command line and working folder when known. */
export interface ProcessInfo {
  command: string;
  cwd?: string;
}

/** Checkouts with a running native build. `hasUnknown`: a build runs outside known checkouts. */
export interface BusyState {
  busy: Set<string>;
  hasUnknown: boolean;
}

/** One Xcode DerivedData folder and the fields of its info.plist. */
export interface DerivedDataEntry {
  dir: string;
  workspacePath?: string;
  lastAccessedMs?: number;
}

/** One simulator from `simctl list devices -j`. */
export interface Simulator {
  name: string;
  udid: string;
  state: string;
}

/** Minimum build fields to choose stale builds. */
export interface CachedBuild {
  platform: string;
  target: string;
  variant: string;
  lastUsedAt: string;
}

/** Reclaim candidates outside the build cache, and the busy state they were chosen with. */
export interface Reclaimable {
  candidates: Candidate[];
  state: BusyState;
}

/** Something reclaim can delete, with the cause in `reason`. */
export interface Candidate {
  kind: string;
  path: string;
  reason: string;
  bytes: number | null;
  remove: () => void;
}

const isInside = (target: string, root: string) =>
  target === root || target.startsWith(`${root}/`);

/** Map running build processes to the checkouts they write. */
export const findBusyCheckouts = (
  processes: ProcessInfo[],
  checkouts: string[]
): BusyState => {
  const busy = new Set<string>();
  let hasUnknown = false;
  for (const { command, cwd } of processes) {
    if (!BUILD_PROCESS.test(command)) {
      continue;
    }
    const owners = checkouts.filter(
      (root) =>
        command.includes(`${root}/`) ||
        (cwd !== undefined && isInside(cwd, root))
    );
    hasUnknown ||= owners.length === 0;
    for (const owner of owners) {
      busy.add(owner);
    }
  }
  return { busy, hasUnknown };
};

/**
 * DerivedData of this app whose checkout is deleted, or idle: no build runs
 * there and Xcode did not use it in the last hour. Other projects stay.
 */
export const selectDerivedData = (
  entries: DerivedDataEntry[],
  state: BusyState & { now: number; hasPath: (target: string) => boolean }
) =>
  entries.flatMap((entry) => {
    const workspace = entry.workspacePath;
    if (
      !workspace ||
      !WORKSPACE_NAMES.has(path.basename(workspace)) ||
      path.basename(path.dirname(workspace)) !== "ios"
    ) {
      return [];
    }
    const checkout = path.dirname(path.dirname(workspace));
    if (!state.hasPath(checkout)) {
      return [{ ...entry, reason: `checkout deleted: ${checkout}` }];
    }
    if (
      state.hasUnknown ||
      state.busy.has(checkout) ||
      (entry.lastAccessedMs !== undefined &&
        state.now - entry.lastAccessedMs < RECENT_ACCESS_MS)
    ) {
      return [];
    }
    return [{ ...entry, reason: `checkout idle: ${checkout}` }];
  });

/** `ios/build/Build` of checkouts without a running build. Never `ios/build` itself. */
export const selectIdleBuildFolders = (
  checkouts: string[],
  state: BusyState
) =>
  state.hasUnknown
    ? []
    : checkouts
        .filter((checkout) => !state.busy.has(checkout))
        .map((checkout) => path.join(checkout, "ios", "build", "Build"));

/** Shut-down simulators this CLI created for checkouts that no longer exist. */
export const selectSimulators = (
  simulators: Simulator[],
  liveHashes: Set<string>
) =>
  simulators.filter((simulator) => {
    const hash = SIMULATOR_NAME.exec(simulator.name)?.groups?.hash;
    return (
      hash !== undefined &&
      simulator.state === "Shutdown" &&
      !liveHashes.has(hash)
    );
  });

/** Builds unused for `maxAgeMs`, except the newest of each platform, target, and variant. */
export const selectStaleBuilds = <T extends CachedBuild>(
  builds: T[],
  now: number,
  maxAgeMs: number
) =>
  [
    ...Map.groupBy(
      builds,
      (build) => `${build.platform}-${build.target}-${build.variant}`
    ).values(),
  ].flatMap((group) =>
    group
      .toSorted((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .slice(1)
      .filter((build) => now - Date.parse(build.lastUsedAt) > maxAgeMs)
  );

/** Files last written more than `maxAgeMs` ago. */
export const selectOldFiles = <T extends { mtimeMs: number }>(
  files: T[],
  now: number,
  maxAgeMs: number
) => files.filter((file) => now - file.mtimeMs > maxAgeMs);

const realpathOrSelf = (target: string) => {
  try {
    return fs.realpathSync(target);
  } catch {
    return target;
  }
};

const readCheckoutRecords = () =>
  fs.existsSync(CHECKOUTS_DIR)
    ? fs.readdirSync(CHECKOUTS_DIR).flatMap((entry) => {
        const file = path.join(CHECKOUTS_DIR, entry, CHECKOUT_FILE);
        const checkout = fs.existsSync(file)
          ? fs.readFileSync(file, "utf-8").trim()
          : "";
        return checkout ? [{ entry, checkout }] : [];
      })
    : [];

/** Existing checkouts: git worktrees of this repository plus CLI checkout records. */
const listLiveCheckouts = () => {
  const worktrees = (
    tryRun("git", ["-C", REPO_ROOT, "worktree", "list", "--porcelain"]) ?? ""
  )
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
  const records = readCheckoutRecords().map(({ checkout }) => checkout);
  return [
    ...new Set(
      [REPO_ROOT, ...worktrees, ...records]
        .filter((checkout) => fs.existsSync(checkout))
        .map(realpathOrSelf)
    ),
  ];
};

const listProcesses = (): ProcessInfo[] => {
  const processes = (tryRun("ps", ["-axo", "pid=,command="]) ?? "")
    .split("\n")
    .flatMap((line) => {
      const match = /^\s*(?<pid>\d+)\s+(?<command>.+)$/u.exec(line);
      return match?.groups
        ? [{ pid: match.groups.pid, command: match.groups.command }]
        : [];
    })
    .filter(({ command }) => BUILD_PROCESS.test(command));
  if (processes.length === 0) {
    return [];
  }
  // lsof -Fn prints `p<pid>` then `n<cwd>` per process.
  const cwds = new Map<string, string>();
  let pid = "";
  for (const line of (
    tryRun("lsof", [
      "-a",
      "-d",
      "cwd",
      "-Fn",
      "-p",
      processes.map((process) => process.pid).join(","),
    ]) ?? ""
  ).split("\n")) {
    if (line.startsWith("p")) {
      pid = line.slice(1);
    } else if (line.startsWith("n")) {
      cwds.set(pid, line.slice(1));
    }
  }
  return processes.map(({ pid: id, command }) => ({
    command,
    cwd: cwds.get(id),
  }));
};

const readPlistValue = (file: string, key: string) =>
  tryRun("plutil", ["-extract", key, "raw", "-o", "-", file]) ?? undefined;

const readDerivedData = (): DerivedDataEntry[] =>
  fs.existsSync(DERIVED_DATA_DIR)
    ? fs.readdirSync(DERIVED_DATA_DIR).flatMap((name) => {
        const dir = path.join(DERIVED_DATA_DIR, name);
        const plist = path.join(dir, "info.plist");
        if (!fs.existsSync(plist)) {
          return [];
        }
        const accessed = readPlistValue(plist, "LastAccessedDate");
        return [
          {
            dir,
            workspacePath: readPlistValue(plist, "WorkspacePath"),
            lastAccessedMs: accessed ? Date.parse(accessed) : undefined,
          },
        ];
      })
    : [];

const readSimulators = (): Simulator[] => {
  const output = tryRun("xcrun", ["simctl", "list", "devices", "-j"]);
  if (!output) {
    return [];
  }
  // SAFETY: simctl list devices -j returns devices grouped by runtime.
  const { devices } = JSON.parse(output) as {
    devices: Record<string, Simulator[]>;
  };
  return Object.values(devices).flat();
};

const listFiles = (dir: string, name: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { recursive: true, encoding: "utf-8" })
        .filter((file) => path.basename(file) === name)
        .map((file) => {
          const full = path.join(dir, file);
          return { path: full, mtimeMs: fs.statSync(full).mtimeMs };
        })
    : [];

const removeDir = (target: string) => () =>
  fs.rmSync(target, { recursive: true, force: true });

/**
 * Collect everything except cached builds that reclaim may delete.
 * `measure` returns the size of a path, or null when unknown.
 */
export const findReclaimable = (
  maxAgeMs: number,
  measure: (target: string) => number | null
): Reclaimable => {
  const now = Date.now();
  const checkouts = listLiveCheckouts();
  const state = findBusyCheckouts(listProcesses(), checkouts);
  const derivedData = selectDerivedData(readDerivedData(), {
    ...state,
    now,
    hasPath: (target) => fs.existsSync(target),
  }).map((entry): Candidate => ({
    kind: "DerivedData",
    path: entry.dir,
    reason: entry.reason,
    bytes: measure(entry.dir),
    remove: removeDir(entry.dir),
  }));
  const buildFolders = selectIdleBuildFolders(checkouts, state)
    .filter((folder) => fs.existsSync(folder))
    .map((folder): Candidate => ({
      kind: "ios/build/Build",
      path: folder,
      reason: "no native build runs in this checkout",
      bytes: measure(folder),
      remove: removeDir(folder),
    }));
  const liveHashes = new Set(checkouts.map(hashCheckout));
  const simulators = selectSimulators(readSimulators(), liveHashes).map(
    (simulator): Candidate => ({
      kind: "simulator",
      path: simulator.name,
      reason: "checkout deleted, simulator shut down",
      bytes: measure(
        path.join(
          os.homedir(),
          "Library",
          "Developer",
          "CoreSimulator",
          "Devices",
          simulator.udid
        )
      ),
      remove: () => {
        execFileSync("xcrun", ["simctl", "delete", simulator.udid], {
          stdio: "ignore",
        });
      },
    })
  );
  const recordings = selectOldFiles(
    listFiles(CHECKOUTS_DIR, "recording.mp4"),
    now,
    maxAgeMs
  ).map((file): Candidate => ({
    kind: "e2e recording",
    path: file.path,
    reason: `older than ${maxAgeMs / 3_600_000}h`,
    bytes: measure(file.path),
    remove: () => fs.rmSync(file.path, { force: true }),
  }));
  return {
    candidates: [...derivedData, ...buildFolders, ...simulators, ...recordings],
    state,
  };
};
